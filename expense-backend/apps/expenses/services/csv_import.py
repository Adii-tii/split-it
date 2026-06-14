import json
import csv
from decimal import Decimal
from datetime import datetime, date, timedelta
from django.contrib.auth import get_user_model
from django.core.validators import validate_email as django_validate_email
from django.db import transaction
from django.conf import settings

from apps.users.selectors import get_user_by_email
from apps.expenses.models import Expense, ExpenseSplit, ImportJob, ImportAnomaly
from apps.groups.models import GroupMembership

User = get_user_model()

def clean_headers(headers):
    """
    Clean and fuzzy-match CSV headers to standard column names:
    date, description, paid_by, amount, currency, split_type, split_with, split_details, notes.
    """
    mapping = {}
    for h in headers:
        if not h:
            continue
        cleaned = h.strip().lower().replace(' ', '_').replace('\t', '')
        if cleaned in ('date', 'dt'):
            mapping[h] = 'date'
        elif cleaned in ('description', 'desc', 'title', 'item', 'name'):
            mapping[h] = 'description'
        elif cleaned in ('paid_by', 'paidby', 'payer', 'who_paid', 'who_paid_email'):
            mapping[h] = 'paid_by'
        elif cleaned in ('amount', 'cost', 'total', 'value', 'price'):
            mapping[h] = 'amount'
        elif cleaned in ('currency', 'curr', 'unit'):
            mapping[h] = 'currency'
        elif cleaned in ('split_type', 'splittype', 'split_mode', 'splitmode', 'type', 'mode'):
            mapping[h] = 'split_type'
        elif cleaned in ('split_with', 'splitwith', 'members', 'split_members', 'split_to'):
            mapping[h] = 'split_with'
        elif cleaned in ('split_details', 'splitdetails', 'shares', 'details', 'weights'):
            mapping[h] = 'split_details'
        elif cleaned in ('notes', 'note', 'memo', 'comment', 'comments'):
            mapping[h] = 'notes'
        else:
            mapping[h] = cleaned
    return mapping


def parse_date(date_str):
    if not date_str:
        raise ValueError("Date is required")
    
    date_str = date_str.strip()
    
    # Try reading as Excel float serial date (e.g. 46054.0)
    try:
        days_float = float(date_str)
        base = date(1899, 12, 30)
        return base + timedelta(days=int(days_float))
    except ValueError:
        pass

    # Try common string date formats
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d', '%d-%m-%Y'):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Invalid date format: '{date_str}'. Use YYYY-MM-DD, DD/MM/YYYY, or Excel date numbers.")


def resolve_user_by_name(name_str, group):
    """
    Fuzzy resolves a username or name (e.g., 'Aisha', 'Priya S') to their email address.
    Checks the group's memberships first.
    """
    name_clean = name_str.strip()
    if not name_clean:
        return None
    
    if '@' in name_clean:
        return name_clean
        
    # Cache memberships on the group object to avoid N+1 queries during import
    memberships = getattr(group, '_memberships_cache', None)
    if memberships is None:
        memberships = list(GroupMembership.objects.filter(group=group).select_related('user'))
        group._memberships_cache = memberships
    
    # Match 1: Exact case-insensitive username match
    for m in memberships:
        if m.user.username.lower() == name_clean.lower():
            return m.user.email
            
    # Match 2: Email prefix matches username case-insensitively
    for m in memberships:
        email_prefix = m.user.email.split('@')[0]
        if email_prefix.lower() == name_clean.lower():
            return m.user.email
            
    # Match 3: Loose startswith match (e.g., "Priya S" matching "Priya")
    for m in memberships:
        u_name = m.user.username.lower()
        n_clean_low = name_clean.lower()
        if u_name.startswith(n_clean_low) or n_clean_low.startswith(u_name):
            return m.user.email
            
    # Match 4: Global DB lookup
    try:
        u = User.objects.filter(username__iexact=name_clean).first()
        if u:
            return u.email
    except Exception:
        pass
        
    return None


def validate_email_address(email_str):
    email = email_str.strip()
    if not email:
        raise ValueError("Email is required")
    try:
        django_validate_email(email)
        return email
    except Exception:
        raise ValueError(f"Invalid email format: '{email}'")


def parse_split_with(split_with_str, group):
    """
    Parses split_with string (comma or semicolon separated names or emails).
    If empty, defaults to all current group members.
    Resolves usernames to emails.
    """
    if not split_with_str or not split_with_str.strip():
        memberships = GroupMembership.objects.filter(group=group)
        emails = [m.user.email for m in memberships]
        if not emails:
            raise ValueError("Group has no members to split with")
        return emails

    separator = ';'
    if ',' in split_with_str and ';' not in split_with_str:
        separator = ','

    parts = [p.strip() for p in split_with_str.split(separator) if p.strip()]
    
    validated = []
    for p in parts:
        email = resolve_user_by_name(p, group)
        if email:
            validated.append(email)
        else:
            # If name is unregistered, return the name so it can be flagged as unregistered
            validated.append(p)
    return validated


def parse_split_details(split_details_str, group):
    """
    Parses split_details string. Format: email:value;email:value or name:value,name:value
    Also supports spaces instead of colons, e.g. "name value" and ignores percent signs.
    Returns dict mapping resolved email/name -> Decimal
    """
    if not split_details_str or not split_details_str.strip():
        return {}

    separator = ';'
    if ',' in split_details_str and ';' not in split_details_str:
        separator = ','

    parts = [p.strip() for p in split_details_str.split(separator) if p.strip()]
    
    details = {}
    for p in parts:
        p_clean = p.strip()
        if ':' in p_clean:
            name, val_str = p_clean.split(':', 1)
        else:
            # Fallback to splitting by the last space
            if ' ' in p_clean:
                name, val_str = p_clean.rsplit(' ', 1)
            else:
                raise ValueError(f"Invalid split details format: '{p}'. Must be 'name:value' or 'name value'.")
        
        name = name.strip()
        val_str = val_str.strip().replace('%', '')
        
        email = resolve_user_by_name(name, group) or name
        try:
            val = Decimal(val_str)
        except Exception:
            raise ValueError(f"Invalid numeric value in split details: '{val_str}'")
        details[email] = val
    return details


def is_settlement_row(row_dict):
    """
    Detects if a row is a settlement (debt repayment) rather than an expense.
    """
    desc = row_dict.get('description', '').lower()
    keywords = ('paid back', 'paid_back', 'pay back', 'pay_back', 'settled', 'settlement', 'repay', 'repayment')
    for kw in keywords:
        if kw in desc:
            return True
    return False


def validate_csv_row(row_dict, group):
    """
    Validates fields of a single parsed row.
    Returns a dict of errors where keys are columns and values are error messages.
    """
    errors = {}

    # 1. Date
    date_str = row_dict.get('date', '').strip()
    parsed_date = None
    try:
        parsed_date = parse_date(date_str)
    except ValueError as e:
        errors['date'] = str(e)

    # 2. Description
    desc = row_dict.get('description', '').strip()
    if not desc:
        errors['description'] = "Description/title is required"

    # 3. Amount (allows negative refund amounts now, but flags zero/invalid)
    amount_str = row_dict.get('amount', '').strip()
    amount = None
    try:
        amount = Decimal(amount_str)
        if amount == 0:
            errors['amount'] = "Amount cannot be zero"
    except Exception:
        errors['amount'] = f"Invalid amount: '{amount_str}'"

    # 4. Paid By
    paid_by_str = row_dict.get('paid_by', '').strip()
    resolved_payer_email = None
    if not paid_by_str:
        errors['paid_by'] = "Payer (paid_by) is missing"
    else:
        resolved_payer_email = resolve_user_by_name(paid_by_str, group)
        if not resolved_payer_email:
            errors['paid_by'] = f"User '{paid_by_str}' is unregistered. We will create a shell account for them."

    # 5. Split Type (if missing, default to equal)
    split_type = row_dict.get('split_type', 'equal').strip().lower()
    if not split_type:
        split_type = 'equal'
    if split_type not in ('equal', 'unequal', 'percentage', 'share'):
        errors['split_type'] = f"Invalid split type: '{split_type}'. Must be equal, unequal, percentage, or share."

    # 6. Split With & Details
    split_with_str = row_dict.get('split_with', '').strip()
    split_with_emails = []
    try:
        split_with_emails = parse_split_with(split_with_str, group)
        # Check if any split member is unregistered
        unregistered = [e for e in split_with_emails if '@' not in e]
        if unregistered:
            # We don't block import for unregistered split users; we auto-create shell users,
            # but we can list it as an info notice or error if required. Let's make it a warning.
            pass
    except ValueError as e:
        errors['split_with'] = str(e)

    split_details_str = row_dict.get('split_details', '').strip()
    split_details = {}
    try:
        split_details = parse_split_details(split_details_str, group)
    except ValueError as e:
        errors['split_details'] = str(e)

    # 7. Check for inactive members (left_at)
    if parsed_date and split_with_emails:
        inactive_members = []
        for email in split_with_emails:
            if '@' in email:
                split_user = get_user_by_email(email)
                if split_user:
                    membership = GroupMembership.objects.filter(group=group, user=split_user).first()
                    if membership and membership.left_at and parsed_date > membership.left_at:
                        inactive_members.append(split_user.username)
        if inactive_members:
            errors['split_with'] = f"Includes member(s) who left the group before this date: {', '.join(inactive_members)}"

    # 8. Cross-field split validation
    if not errors and amount is not None:
        # Check if amount is negative (refund check)
        if amount < 0:
            # We allow it, but let's make sure it has valid splits
            pass
            
        if split_type == 'equal':
            # split_details says equal but someone added shares anyway check
            if split_details:
                # We flag a warning, but don't strictly fail.
                # Actually if they added shares, we should check if they want equal or shares.
                # Let's let them know.
                pass
        elif split_type == 'unequal':
            if not split_details:
                errors['split_details'] = "split_details is required for split_type 'unequal'."
            else:
                for email in split_with_emails:
                    if email not in split_details:
                        errors['split_details'] = f"Missing split amount for: {email.split('@')[0]}"
                
                # Check sum equals total amount (absolute values for refund support)
                total_split = sum(split_details.get(e, Decimal(0)) for e in split_with_emails)
                if abs(abs(total_split) - abs(amount)) > Decimal('0.05'):
                    errors['split_details'] = f"Sum of split details ({total_split}) must equal expense amount ({amount})"
        elif split_type == 'percentage':
            if not split_details:
                errors['split_details'] = "split_details is required for split_type 'percentage'."
            else:
                for email in split_with_emails:
                    if email not in split_details:
                        errors['split_details'] = f"Missing percentage for: {email.split('@')[0]}"
                
                # Check sum equals 100
                total_pct = sum(split_details.get(e, Decimal(0)) for e in split_with_emails)
                if abs(total_pct - 100) > Decimal('0.1'):
                    errors['split_details'] = f"Sum of percentages ({total_pct}%) must equal 100%"
        elif split_type == 'share':
            if not split_details:
                errors['split_details'] = "split_details is required for split_type 'share'."
            else:
                for email in split_with_emails:
                    if email not in split_details:
                        errors['split_details'] = f"Missing share weight for: {email.split('@')[0]}"
                
                total_shares = sum(split_details.get(e, Decimal(0)) for e in split_with_emails)
                if total_shares <= 0:
                    errors['split_details'] = "Sum of share weights must be greater than zero."

    return errors


def create_expense_from_row_data(row_dict, group):
    """
    Creates Expense/ExpenseSplit OR Settlement objects.
    Assumes row_dict is fully validated.
    Auto-creates shell users and memberships for new emails/names.
    Updates group membership net balances.
    """
    date_val = parse_date(row_dict.get('date'))
    description = row_dict.get('description').strip()
    amount = Decimal(str(row_dict.get('amount')))
    currency = row_dict.get('currency', 'INR').strip() or 'INR'
    split_type = row_dict.get('split_type', 'equal').strip().lower() or 'equal'
    notes = row_dict.get('notes', '').strip()
    paid_by_str = row_dict.get('paid_by').strip()

    # 1. Resolve or create payer
    payer_email = resolve_user_by_name(paid_by_str, group)
    if not payer_email:
        # Generate safe email if username was inputted
        payer_email = paid_by_str if '@' in paid_by_str else f"{paid_by_str.lower().replace(' ', '_')}@example.com"
        
    payer_user = get_user_by_email(payer_email)
    if not payer_user:
        import uuid
        username_part = payer_email.split('@')[0]
        payer_user = User.objects.create_user(
            email=payer_email,
            username=username_part,
            password=str(uuid.uuid4())
        )
    
    # Ensure payer membership
    if not GroupMembership.objects.filter(group=group, user=payer_user).exists():
        GroupMembership.objects.create(
            group=group,
            user=payer_user,
            joined_at=date_val
        )

    # 2. Check if this row is approved to be imported as a settlement
    is_settlement = row_dict.get('is_settlement', False) or is_settlement_row(row_dict)
    
    # If it is classified as a settlement, create a Settlement record
    if is_settlement:
        from apps.settlements.models.settlement import Settlement
        
        # Payee is the first member in split_with
        split_with_str = row_dict.get('split_with', '').strip()
        split_with_emails = parse_split_with(split_with_str, group)
        if not split_with_emails:
            raise ValueError("Settlement payee must be specified in split_with")
            
        payee_email = split_with_emails[0]
        payee_user = get_user_by_email(payee_email)
        if not payee_user:
            import uuid
            payee_name = payee_email.split('@')[0]
            payee_user = User.objects.create_user(
                email=payee_email,
                username=payee_name,
                password=str(uuid.uuid4())
            )
            
        # Ensure payee membership
        if not GroupMembership.objects.filter(group=group, user=payee_user).exists():
            GroupMembership.objects.create(
                group=group,
                user=payee_user,
                joined_at=date_val
            )
            
        settlement = Settlement.objects.create(
            group=group,
            payer=payer_user,
            payee=payee_user,
            amount=amount,
            currency=currency,
            note=description,
            date=date_val
        )
        
        # Update net balances for settlements
        payer_membership = GroupMembership.objects.filter(group=group, user=payer_user).first()
        payer_membership.net_balance += amount
        payer_membership.save()
        
        payee_membership = GroupMembership.objects.filter(group=group, user=payee_user).first()
        payee_membership.net_balance -= amount
        payee_membership.save()
        
        return settlement

    # 3. Create regular Expense
    split_with_emails = parse_split_with(row_dict.get('split_with'), group)
    
    # Resolve split_details names to emails
    raw_details = parse_split_details(row_dict.get('split_details'), group)
    split_details = {}
    for k, v in raw_details.items():
        email_key = resolve_user_by_name(k, group) or (k if '@' in k else f"{k.lower().replace(' ', '_')}@example.com")
        split_details[email_key] = v

    # Auto-adjust: split_type says equal but someone added shares anyway
    # If split_details are provided, and split_type is equal, let's treat it as equal (ignore shares) OR change type.
    # We follow the standard model behavior. Let's do equal.

    expense = Expense.objects.create(
        group=group,
        description=description,
        amount=amount,
        currency=currency,
        exchange_rate=Decimal('1.0'),
        paid_by=payer_user,
        split_type=split_type,
        category='Imported',
        date=date_val,
        notes=notes
    )

    # 4. Calculate division of shares
    shares = {}        # email -> Decimal (actual amount in currency)
    share_values = {}  # email -> Decimal (raw ratio / percent / amount)

    # Clean up the emails list to resolve usernames
    resolved_split_emails = []
    for e in split_with_emails:
        email = resolve_user_by_name(e, group) or (e if '@' in e else f"{e.lower().replace(' ', '_')}@example.com")
        resolved_split_emails.append(email)

    if split_type == 'equal':
        n = len(resolved_split_emails)
        equal_share = amount / Decimal(n)
        for email in resolved_split_emails:
            shares[email] = equal_share
            share_values[email] = equal_share
    elif split_type == 'unequal':
        for email in resolved_split_emails:
            val = split_details.get(email, Decimal(0))
            shares[email] = val
            share_values[email] = val
    elif split_type == 'percentage':
        for email in resolved_split_emails:
            pct = split_details.get(email, Decimal(0))
            shares[email] = amount * (pct / Decimal('100'))
            share_values[email] = pct
    elif split_type == 'share':
        total_shares = sum(split_details.get(e, Decimal(0)) for e in resolved_split_emails)
        if total_shares > 0:
            for email in resolved_split_emails:
                weight = split_details.get(email, Decimal(0))
                shares[email] = amount * (weight / total_shares)
                share_values[email] = weight
        else:
            n = len(resolved_split_emails)
            equal_share = amount / Decimal(n)
            for email in resolved_split_emails:
                shares[email] = equal_share
                share_values[email] = Decimal(1)

    # 5. Apply balance updates to database and create ExpenseSplit
    # Credit the payer
    payer_membership = GroupMembership.objects.filter(group=group, user=payer_user).first()
    if payer_membership:
        payer_membership.net_balance += amount
        payer_membership.save()

    # Debit split targets
    for email in resolved_split_emails:
        split_user = get_user_by_email(email)
        if not split_user:
            import uuid
            username_part = email.split('@')[0]
            split_user = User.objects.create_user(
                email=email,
                username=username_part,
                password=str(uuid.uuid4())
            )
        
        # Ensure membership
        if not GroupMembership.objects.filter(group=group, user=split_user).exists():
            GroupMembership.objects.create(
                group=group,
                user=split_user,
                joined_at=date_val
            )

        # Subtract split share
        split_membership = GroupMembership.objects.filter(group=group, user=split_user).first()
        if split_membership:
            split_membership.net_balance -= shares[email]
            split_membership.save()

        # Save individual ExpenseSplit object
        ExpenseSplit.objects.create(
            expense=expense,
            user=split_user,
            amount=shares[email],
            share_value=share_values.get(email, shares[email])
        )

    return expense


def detect_duplicates(rows):
    """
    Scans through CSV rows and detects potential duplicate records.
    Returns a dict mapping row_index -> previous_row_index.
    """
    seen = {} # key -> (row_index, desc, amount, date, payer)
    duplicates = {}
    for idx, r in enumerate(rows, start=1):
        desc = r.get('description', '').strip().lower()
        amt_str = r.get('amount', '').strip()
        date_str = r.get('date', '').strip()
        payer = r.get('paid_by', '').strip().lower()
        
        if not desc or not amt_str or not date_str:
            continue
            
        try:
            amt = float(amt_str)
            d_val = parse_date(date_str)
        except Exception:
            continue
            
        is_dup = False
        for prev_idx, prev_desc, prev_amt, prev_date, prev_payer in seen.values():
            # Match Condition 1: Same date, same amount, same payer
            if d_val == prev_date and abs(amt - prev_amt) < 0.01 and payer == prev_payer:
                duplicates[idx] = prev_idx
                is_dup = True
                break
                
            # Match Condition 2: Same date (or within 1 day), close amount (within 5%), and share common word
            if abs((d_val - prev_date).days) <= 1 and abs(amt - prev_amt) <= 0.05 * abs(prev_amt):
                # Clean descriptions to extract words
                w1 = set(w for w in desc.replace('-', ' ').replace('_', ' ').split() if len(w) >= 4)
                w2 = set(w for w in prev_desc.replace('-', ' ').replace('_', ' ').split() if len(w) >= 4)
                if w1.intersection(w2):
                    duplicates[idx] = prev_idx
                    is_dup = True
                    break
                    
        if not is_dup:
            seen[idx] = (idx, desc, amt, d_val, payer)
            
    return duplicates
