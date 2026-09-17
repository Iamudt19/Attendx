import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session
from app.models.models import AttendanceSession, AttendanceRecord, Student, Subject, Class, Enrollment
from app.core.config import settings

class ExcelService:
    def __init__(self, export_dir: str = settings.EXPORTS_DIR):
        self.export_dir = export_dir
        os.makedirs(self.export_dir, exist_ok=True)

    def generate_class_attendance_excel(self, db: Session, class_id: int, subject_id: Optional[int] = None) -> str:
        """
        Generates or updates an Excel workbook for a Class (and optional Subject).
        """
        cls = db.query(Class).filter(Class.id == class_id).first()
        if not cls:
            raise ValueError("Class not found")

        subject = None
        if subject_id:
            subject = db.query(Subject).filter(Subject.id == subject_id).first()

        filename = f"Attendance_{cls.name.replace(' ', '_')}_{cls.section.replace(' ', '_')}"
        if subject:
            filename += f"_{subject.code}"
        filename += ".xlsx"

        filepath = os.path.join(self.export_dir, filename)

        # Create workbook
        wb = openpyxl.Workbook()
        
        # Setup Sheet 1: Attendance
        ws1 = wb.active
        ws1.title = "Attendance Records"

        # Setup Sheet 2: Summary
        ws2 = wb.create_sheet(title="Attendance Summary")

        # Styling tokens
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid") # Dark slate
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        title_font = Font(name="Calibri", size=14, bold=True, color="0F172A")
        sub_font = Font(name="Calibri", size=10, italic=True, color="475569")
        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )
        present_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid") # Light green
        absent_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid") # Light red

        # ------------------- SHEET 1: ATTENDANCE RECORDS -------------------
        ws1.cell(row=1, column=1, value=f"AttendX — Attendance Register: {cls.name} {cls.section} ({cls.academic_year})").font = title_font
        if subject:
            ws1.cell(row=2, column=1, value=f"Subject: {subject.name} ({subject.code})").font = sub_font

        headers1 = ["Student ID", "Roll No", "Student Name", "Date", "Subject", "Status", "Confidence"]
        start_row1 = 4

        for col_num, header in enumerate(headers1, 1):
            cell = ws1.cell(row=start_row1, column=col_num, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Query all sessions for this class (and subject if filtered)
        query = db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id)
        if subject_id:
            query = query.filter(AttendanceSession.subject_id == subject_id)
        sessions = query.order_by(AttendanceSession.date.desc()).all()

        current_row = start_row1 + 1
        for sess in sessions:
            sub_code = sess.subject.code if sess.subject else "N/A"
            for record in sess.records:
                student = record.student
                if not student:
                    continue

                ws1.cell(row=current_row, column=1, value=student.student_id).alignment = Alignment(horizontal="center")
                ws1.cell(row=current_row, column=2, value=student.roll_number).alignment = Alignment(horizontal="center")
                ws1.cell(row=current_row, column=3, value=student.name)
                ws1.cell(row=current_row, column=4, value=sess.date).alignment = Alignment(horizontal="center")
                ws1.cell(row=current_row, column=5, value=sub_code).alignment = Alignment(horizontal="center")
                
                status_cell = ws1.cell(row=current_row, column=6, value=record.status)
                status_cell.alignment = Alignment(horizontal="center")
                if record.status == "PRESENT":
                    status_cell.fill = present_fill
                else:
                    status_cell.fill = absent_fill

                conf_cell = ws1.cell(row=current_row, column=7, value=record.confidence)
                conf_cell.number_format = "0.0%"
                conf_cell.alignment = Alignment(horizontal="right")

                for col in range(1, 8):
                    ws1.cell(row=current_row, column=col).border = thin_border

                current_row += 1

        # Freeze panes & filter for Sheet 1
        ws1.freeze_panes = "A5"
        ws1.auto_filter.ref = f"A4:G{max(start_row1, current_row - 1)}"

        # Auto-adjust column widths for Sheet 1
        for col in ws1.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws1.column_dimensions[col_letter].width = max(max_len + 4, 12)

        # ------------------- SHEET 2: ATTENDANCE SUMMARY -------------------
        ws2.cell(row=1, column=1, value=f"AttendX — Student Cumulative Summary: {cls.name} {cls.section}").font = title_font

        headers2 = ["Student ID", "Roll No", "Student Name", "Total Classes", "Present", "Absent", "Attendance %"]
        start_row2 = 3

        for col_num, header in enumerate(headers2, 1):
            cell = ws2.cell(row=start_row2, column=col_num, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Query all students in class
        students = db.query(Student).filter(Student.class_id == class_id, Student.active == True).order_by(Student.roll_number).all()

        curr_row2 = start_row2 + 1
        for st in students:
            # Count records for student
            r_query = db.query(AttendanceRecord).join(AttendanceSession).filter(
                AttendanceRecord.student_id == st.id,
                AttendanceSession.class_id == class_id
            )
            if subject_id:
                r_query = r_query.filter(AttendanceSession.subject_id == subject_id)

            total_classes = r_query.count()
            present_classes = r_query.filter(AttendanceRecord.status == "PRESENT").count()
            absent_classes = total_classes - present_classes
            pct = (present_classes / total_classes) if total_classes > 0 else 1.0

            ws2.cell(row=curr_row2, column=1, value=st.student_id).alignment = Alignment(horizontal="center")
            ws2.cell(row=curr_row2, column=2, value=st.roll_number).alignment = Alignment(horizontal="center")
            ws2.cell(row=curr_row2, column=3, value=st.name)
            ws2.cell(row=curr_row2, column=4, value=total_classes).alignment = Alignment(horizontal="center")
            ws2.cell(row=curr_row2, column=5, value=present_classes).alignment = Alignment(horizontal="center")
            ws2.cell(row=curr_row2, column=6, value=absent_classes).alignment = Alignment(horizontal="center")

            pct_cell = ws2.cell(row=curr_row2, column=7, value=pct)
            pct_cell.number_format = "0.0%"
            pct_cell.alignment = Alignment(horizontal="right")

            for col in range(1, 8):
                ws2.cell(row=curr_row2, column=col).border = thin_border

            curr_row2 += 1

        ws2.freeze_panes = "A4"
        ws2.auto_filter.ref = f"A3:G{max(start_row2, curr_row2 - 1)}"

        for col in ws2.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws2.column_dimensions[col_letter].width = max(max_len + 4, 12)

        wb.save(filepath)
        return filepath

excel_service = ExcelService()
