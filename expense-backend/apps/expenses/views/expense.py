import json
import csv
import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import date
from decimal import Decimal

from apps.groups.selectors.group import get_group_by_id, get_user_net_balance_in_group
from apps.expenses.models import Expense, ExpenseSplit
from apps.expenses.serializers.expense import ExpenseSerializer
from apps.expenses.serializers.import_job import ImportJobSerializer, ImportAnomalySerializer
from apps.expenses.services.csv_import import (
    clean_headers, 
    validate_csv_row, 
    create_expense_from_row_data,
    detect_duplicates,
    is_settlement_row
)
from apps.users.selectors import get_user_by_email

User = get_user_model()


class ExpenseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        expenses = Expense.objects.filter(group=group).order_by('-date', '-created_at')
        net_balance = get_user_net_balance_in_group(group, request.user)

        serializer = ExpenseSerializer(expenses, many=True)
        return Response({
            "expenses": serializer.data,
            "netBalance": net_balance
        }, status=status.HTTP_200_OK)

    def post(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        title = request.data.get('title')
        category = request.data.get('category', 'Food')
        currency = request.data.get('currency', 'INR')
        amount_val = request.data.get('amount')
        splits_data = request.data.get('splits')
        paid_by_data = request.data.get('paidBy')
        split_type = request.data.get('splitType', 'equal')
        notes = request.data.get('notes', '')

        if not title or amount_val is None or not splits_data or not paid_by_data:
            return Response({"message": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_val))
        except Exception:
            return Response({"message": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        # Identify primary payer (highest paying user)
        valid_payers = [p for p in paid_by_data if float(p.get('amount', 0)) > 0]
        if not valid_payers:
            return Response({"message": "No valid payers specified"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify paid and split totals match the expense amount
        paid_total = Decimal(str(sum(float(p.get('amount', 0)) for p in paid_by_data)))
        split_total = Decimal(str(sum(float(s.get('share', 0)) for s in splits_data)))

        if abs(paid_total - amount) > Decimal('0.05') or abs(split_total - amount) > Decimal('0.05'):
            return Response({
                "message": f"Paid total ({paid_total}) and split total ({split_total}) must equal expense amount ({amount})"
            }, status=status.HTTP_400_BAD_REQUEST)

        primary_payer_data = max(valid_payers, key=lambda p: float(p['amount']))
        primary_payer = get_user_by_email(primary_payer_data['email'])
        if not primary_payer:
            return Response({"message": f"Primary payer {primary_payer_data['email']} not found"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Create Expense
                expense = Expense.objects.create(
                    group=group,
                    description=title,
                    amount=amount,
                    currency=currency,
                    exchange_rate=Decimal('1.0'),  # Defaults to 1.0 for local/MVP
                    paid_by=primary_payer,
                    split_type=split_type,
                    category=category,
                    date=date.today(),
                    notes=notes
                )

                # Create ExpenseSplit records and deduct from member net balances
                for split in splits_data:
                    email = split.get('email')
                    share = split.get('share', 0)
                    if not email:
                        continue
                    
                    split_user = get_user_by_email(email)
                    if not split_user:
                        # Auto-create invited shell user
                        import uuid
                        username_part = email.split('@')[0]
                        split_user = User.objects.create_user(
                            email=email,
                            username=username_part,
                            password=str(uuid.uuid4())
                        )
                        # Add membership if missing
                        from apps.groups.models import GroupMembership
                        if not GroupMembership.objects.filter(group=group, user=split_user).exists():
                            GroupMembership.objects.create(
                                group=group,
                                user=split_user,
                                joined_at=date.today()
                            )

                    # Deduct split share from net balance
                    from apps.groups.models import GroupMembership
                    membership = GroupMembership.objects.filter(group=group, user=split_user).first()
                    if membership:
                        membership.net_balance -= Decimal(str(share))
                        membership.save()

                    ExpenseSplit.objects.create(
                        expense=expense,
                        user=split_user,
                        amount=Decimal(str(share)),
                        share_value=Decimal(str(split.get('share_value', share) or share))
                    )

                # Add paid amounts to member net balances
                for payer in paid_by_data:
                    email = payer.get('email')
                    amt = Decimal(str(payer.get('amount', 0)))
                    payer_user = get_user_by_email(email)
                    if payer_user:
                        from apps.groups.models import GroupMembership
                        membership = GroupMembership.objects.filter(group=group, user=payer_user).first()
                        if not membership:
                            membership = GroupMembership.objects.create(
                                group=group,
                                user=payer_user,
                                joined_at=date.today()
                            )
                        membership.net_balance += amt
                        membership.save()

                serializer = ExpenseSerializer(expense)
                return Response({
                    "expense": serializer.data,
                    "message": "Expense created successfully"
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"message": f"Internal server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExpenseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, group_id, expense_id):
        return Response({
            "message": "Editing expenses after settlements is restricted. Create a correction expense instead."
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, group_id, expense_id):
        try:
            with transaction.atomic():
                expense = Expense.objects.get(id=expense_id, group_id=group_id)

                # Reverse splits
                for split in expense.splits.all():
                    from apps.groups.models import GroupMembership
                    membership = GroupMembership.objects.filter(group=expense.group, user=split.user).first()
                    if membership:
                        membership.net_balance += split.amount
                        membership.save()

                # Reverse paid amount
                from apps.groups.models import GroupMembership
                membership = GroupMembership.objects.filter(group=expense.group, user=expense.paid_by).first()
                if membership:
                    membership.net_balance -= expense.amount
                    membership.save()

                expense.delete()
                return Response({"message": "Expense deleted"}, status=status.HTTP_200_OK)
        except Expense.DoesNotExist:
            return Response({"message": "Expense does not exist"}, status=status.HTTP_404_NOT_FOUND)


class ExpenseTotalOwedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        balance = get_user_net_balance_in_group(group, request.user)
        total_owed = abs(balance) if balance < 0 else 0.0
        return Response({"totalOwed": round(total_owed, 2)}, status=status.HTTP_200_OK)


class ExpenseTotalIsOwedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        balance = get_user_net_balance_in_group(group, request.user)
        total_is_owed = balance if balance > 0 else 0.0
        return Response({"totalIsOwed": round(total_is_owed, 2)}, status=status.HTTP_200_OK)


class ExpensePeopleIOweView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        my_balance = get_user_net_balance_in_group(group, request.user)
        if my_balance >= 0:
            return Response({"creditors": []}, status=status.HTTP_200_OK)

        remaining_debt = abs(my_balance)
        creditors = []

        # Get all members of the group
        from apps.groups.models import GroupMembership
        memberships = GroupMembership.objects.filter(group=group).select_related('user')
        
        # Deduplicate to find the active net balance per email
        balances = {}
        for ms in memberships:
            balances[ms.user.email] = float(ms.net_balance)

        for email, bal in balances.items():
            if remaining_debt <= 0:
                break
            if email == request.user.email:
                continue
            if bal > 0:
                amount = min(remaining_debt, bal)
                creditors.append({
                    "email": email,
                    "amount": round(amount, 2)
                })
                remaining_debt -= amount

        return Response({"creditors": creditors}, status=status.HTTP_200_OK)


class CSVImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({"message": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({"message": "Uploaded file must be a CSV"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Read file content
            file_data = csv_file.read().decode('utf-8-sig')
            io_string = io.StringIO(file_data)
            reader = csv.reader(io_string)
            
            # Read header row
            try:
                headers = next(reader)
            except StopIteration:
                return Response({"message": "Empty CSV file"}, status=status.HTTP_400_BAD_REQUEST)

            header_mapping = clean_headers(headers)
            
            rows = []
            for row in reader:
                if not any(row):  # skip empty lines
                    continue
                row_dict = {}
                for idx, val in enumerate(row):
                    if idx < len(headers):
                        standard_name = header_mapping.get(headers[idx], headers[idx].strip().lower())
                        row_dict[standard_name] = val
                rows.append(row_dict)
                
            if not rows:
                return Response({"message": "No data rows found in CSV"}, status=status.HTTP_400_BAD_REQUEST)
                
            duplicates = detect_duplicates(rows)
            
            with transaction.atomic():
                from apps.expenses.models import ImportJob, ImportAnomaly
                
                job = ImportJob.objects.create(
                    group=group,
                    status='pending'
                )
                
                for idx, row in enumerate(rows, start=1):
                    missing_currency = False
                    if not row.get('currency'):
                        row['currency'] = 'INR'
                        missing_currency = True
                        
                    is_settle = is_settlement_row(row)
                    if is_settle:
                        row['is_settlement'] = True

                    errors = validate_csv_row(row, group)
                    
                    if idx in duplicates:
                        prev_idx = duplicates[idx]
                        prev_row = rows[prev_idx - 1]
                        errors['duplicate'] = f"Potential duplicate of Row {prev_idx} ('{prev_row.get('description')}') on {prev_row.get('date')}."

                    if errors:
                        ImportAnomaly.objects.create(
                            job=job,
                            row_index=idx,
                            anomaly_type='validation_error',
                            description=json.dumps(errors),
                            status='pending',
                            raw_data=json.dumps(row)
                        )
                    else:
                        a_type = 'none'
                        desc = 'Row is valid'
                        if is_settle:
                            a_type = 'settlement'
                            desc = 'Auto-detected as settlement/repayment instead of an expense.'
                        elif missing_currency:
                            a_type = 'missing_currency'
                            desc = 'Currency field was missing; automatically defaulted to INR.'
                            
                        ImportAnomaly.objects.create(
                            job=job,
                            row_index=idx,
                            anomaly_type=a_type,
                            description=desc,
                            status='approved',
                            raw_data=json.dumps(row),
                            resolved_data=json.dumps(row)
                        )
                        
                serializer = ImportJobSerializer(job)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({"message": f"Failed to process CSV file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class CSVAnomalyUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, group_id, anomaly_id):
        from apps.expenses.models import ImportAnomaly
        
        try:
            anomaly = ImportAnomaly.objects.get(id=anomaly_id, job__group_id=group_id)
        except ImportAnomaly.DoesNotExist:
            return Response({"message": "Anomaly not found"}, status=status.HTTP_404_NOT_FOUND)
            
        status_val = request.data.get('status')
        resolved_data = request.data.get('resolved_data')
        
        if status_val not in (None, 'pending', 'approved', 'ignored'):
            return Response({"message": f"Invalid status: {status_val}"}, status=status.HTTP_400_BAD_REQUEST)
            
        if status_val:
            anomaly.status = status_val
            
        if resolved_data is not None:
            if isinstance(resolved_data, str):
                try:
                    row_dict = json.loads(resolved_data)
                except Exception:
                    return Response({"message": "Invalid JSON in resolved_data"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                row_dict = resolved_data
                
            errors = validate_csv_row(row_dict, anomaly.job.group)
            if errors and status_val == 'approved':
                return Response({
                    "message": "Cannot approve resolved data containing validation errors",
                    "errors": errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
            anomaly.resolved_data = json.dumps(row_dict)
            if not errors and status_val is None:
                anomaly.status = 'approved'
            elif errors:
                anomaly.status = 'pending'
                anomaly.description = json.dumps(errors)
                
        anomaly.save()
        serializer = ImportAnomalySerializer(anomaly)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CSVImportConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, job_id):
        from apps.expenses.models import ImportJob, ImportAnomaly
        
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            job = ImportJob.objects.get(id=job_id, group=group)
        except ImportJob.DoesNotExist:
            return Response({"message": "Import job not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if job.status == 'processed':
            return Response({"message": "Import job has already been processed"}, status=status.HTTP_400_BAD_REQUEST)
            
        resolutions = request.data.get('resolutions', [])
        
        try:
            with transaction.atomic():
                # Apply resolutions if sent with confirmation
                for res in resolutions:
                    an_id = res.get('anomaly_id')
                    res_status = res.get('status')
                    res_data = res.get('resolved_data')
                    
                    if not an_id:
                        continue
                    try:
                        anomaly = ImportAnomaly.objects.get(id=an_id, job=job)
                        if res_status:
                            anomaly.status = res_status
                        if res_data:
                            anomaly.resolved_data = json.dumps(res_data) if isinstance(res_data, dict) else res_data
                            if anomaly.status == 'approved':
                                r_dict = res_data if isinstance(res_data, dict) else json.loads(res_data)
                                errors = validate_csv_row(r_dict, group)
                                if errors:
                                    raise ValueError(f"Row {anomaly.row_index} has validation errors: {errors}")
                        anomaly.save()
                    except ImportAnomaly.DoesNotExist:
                        pass
                
                # Check for pending anomalies
                anomalies = job.anomalies.all()
                pending_anomalies = anomalies.filter(status='pending')
                if pending_anomalies.exists():
                    pending_indices = [str(a.row_index) for a in pending_anomalies]
                    return Response({
                        "message": f"Cannot confirm import. Rows {', '.join(pending_indices)} are still pending resolution.",
                        "pending_rows": pending_indices
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                # Create expenses for approved rows
                created_count = 0
                for anomaly in anomalies.order_by('row_index'):
                    if anomaly.status == 'ignored':
                        continue
                    elif anomaly.status == 'approved':
                        data_str = anomaly.resolved_data or anomaly.raw_data
                        if not data_str:
                            continue
                        row_dict = json.loads(data_str)
                        create_expense_from_row_data(row_dict, group)
                        created_count += 1
                        
                # Complete the job
                job.status = 'processed'
                job.save()
                job.anomalies.all().delete()
                
                return Response({
                    "message": f"Successfully imported {created_count} expenses.",
                    "status": "success",
                    "imported_count": created_count
                }, status=status.HTTP_200_OK)
                
        except ValueError as e:
            return Response({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"message": f"Internal server error during confirmation: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

