import zipfile
import xml.etree.ElementTree as ET
import csv
import os

def parse_xlsx(file_path, output_csv_path):
    print(f"Parsing {file_path}...")
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        # Load shared strings
        shared_strings = []
        try:
            shared_strings_xml = zip_ref.read('xl/sharedStrings.xml')
            root = ET.fromstring(shared_strings_xml)
            # Namespace map
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in root.findall('ns:si', ns):
                # Check for <t> tag, or nested formatting
                t_elements = si.findall('.//ns:t', ns)
                val = "".join([t.text for t in t_elements if t.text is not None])
                shared_strings.append(val)
        except KeyError:
            print("No shared strings found.")

        # Load sheet1
        sheet_xml = zip_ref.read('xl/worksheets/sheet1.xml')
        root = ET.fromstring(sheet_xml)
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        # We will parse cells and place them in a matrix
        data = {}
        max_row = 0
        max_col = 0

        # Helper to convert cell ref like "A1" to (row, col) indices
        def cell_ref_to_indices(ref):
            col_str = ""
            row_str = ""
            for char in ref:
                if char.isalpha():
                    col_str += char
                else:
                    row_str += char
            
            # Convert col_str to 0-based index
            col = 0
            for char in col_str:
                col = col * 26 + (ord(char.upper()) - ord('A') + 1)
            col -= 1
            
            row = int(row_str) - 1
            return row, col

        for row_elem in root.findall('.//ns:row', ns):
            r_idx_str = row_elem.attrib.get('r')
            for cell_elem in row_elem.findall('ns:c', ns):
                r_ref = cell_elem.attrib.get('r')
                if not r_ref:
                    continue
                r, c = cell_ref_to_indices(r_ref)
                
                max_row = max(max_row, r)
                max_col = max(max_col, c)
                
                cell_type = cell_elem.attrib.get('t', '')
                val_elem = cell_elem.find('ns:v', ns)
                
                val = ""
                if val_elem is not None and val_elem.text is not None:
                    val = val_elem.text
                    if cell_type == 's':  # Shared string
                        idx = int(val)
                        if idx < len(shared_strings):
                            val = shared_strings[idx]
                
                if r not in data:
                    data[r] = {}
                data[r][c] = val

        print(f"Max row: {max_row}, Max col: {max_col}")
        
        # Write to CSV
        with open(output_csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for r in range(max_row + 1):
                row_data = []
                for c in range(max_col + 1):
                    row_data.append(data.get(r, {}).get(c, ""))
                writer.writerow(row_data)
        
        print(f"Successfully wrote CSV to {output_csv_path}")

if __name__ == "__main__":
    xlsx_path = r"D:\projects\expenseMerge\expenses_export.xlsx"
    csv_path = r"D:\projects\expenseMerge\expenses_export.csv"
    parse_xlsx(xlsx_path, csv_path)
