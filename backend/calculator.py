"""
Complete Anna University CGPA Calculator - Regulation 2021
Implements comprehensive calculation logic with multi-semester tracking,
arrears handling, and detailed reporting.

Author: Anna University CGPA Calculator
Version: 2.1.0
Date: January 31, 2026
"""

from typing import List, Dict, Tuple, Optional, Union
import json
from dataclasses import dataclass, asdict
from datetime import datetime

# Optional CurriculumService import
try:
    from curriculum_service import CurriculumService
except ImportError:
    CurriculumService = None

@dataclass
class Subject:
    """Represents a single subject with grade and credit information"""
    code: str
    name: str = ""
    credits: float = 3.0  # Changed to float to support 1.5 credits
    grade: str = ""
    marks: Optional[int] = None
    grade_points: float = 0.0
    weighted_points: float = 0.0
    status: str = "PENDING"  # PASS, FAIL, PENDING
    attempt: int = 1  # Track revaluation attempts
    original_semester: Optional[int] = None  # For arrear detection
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class SemesterResult:
    """Complete semester results with GPA and subject breakdown"""
    semester: int
    gpa: float
    credits_attempted: int
    credits_earned: int
    total_points: float
    subjects: List[Subject]
    passed_subjects: int
    failed_subjects: int
    
    def to_dict(self) -> Dict:
        return {
            'semester': self.semester,
            'gpa': self.gpa,
            'credits_attempted': self.credits_attempted,
            'credits_earned': self.credits_earned,
            'total_points': self.total_points,
            'subjects': [s.to_dict() for s in self.subjects],
            'passed_subjects': self.passed_subjects,
            'failed_subjects': self.failed_subjects,
            'subject_count': len(self.subjects)
        }

@dataclass
class CGPAReport:
    """Complete CGPA report with all calculations and breakdowns"""
    cgpa: float
    percentage: float
    class_division: str
    total_semesters: int
    total_credits_attempted: int
    total_credits_earned: int
    total_subjects: int
    passed_subjects: int
    failed_subjects: int
    current_arrears: int
    semester_results: List[SemesterResult]
    calculation_date: str
    regulation: str = "2021"
    
    def to_dict(self) -> Dict:
        return {
            'cgpa': self.cgpa,
            'percentage': f"{self.percentage}%",
            'class_division': self.class_division,
            'total_semesters': self.total_semesters,
            'total_credits_attempted': self.total_credits_attempted,
            'total_credits_earned': self.total_credits_earned,
            'total_subjects': self.total_subjects,
            'passed_subjects': self.passed_subjects,
            'failed_subjects': self.failed_subjects,
            'current_arrears': self.current_arrears,
            'semester_results': [sr.to_dict() for sr in self.semester_results],
            'calculation_date': self.calculation_date,
            'regulation': self.regulation
        }

class AnnaUniversityCGPA:
    """
    Complete CGPA Calculator for Anna University (Regulation 2021)
    
    Features:
    - Multi-semester tracking and calculations
    - Arrears handling with revaluation support
    - Per-semester GPA calculation
    - Overall CGPA with weighted averages
    - Class division determination
    - Comprehensive reporting
    - Support for all Anna University grade scales
    """
    
    # R2017/R2021/R2025 Grading Scale (official Anna University)
    GRADE_SCALE = {
        'O':  {'points': 10, 'marks_range': '91-100', 'description': 'Outstanding'},
        'A+': {'points': 9,  'marks_range': '81-90',  'description': 'Excellent'},
        'A':  {'points': 8,  'marks_range': '71-80',  'description': 'Very Good'},
        'B+': {'points': 7,  'marks_range': '61-70',  'description': 'Good'},
        'B':  {'points': 6,  'marks_range': '56-60',  'description': 'Above Average'},
        'C':  {'points': 5,  'marks_range': '50-55',  'description': 'Average'},
        'P':  {'points': 5,  'marks_range': '40-49',  'description': 'Pass'},
        # Fail / Absent grades
        'RA': {'points': 0, 'marks_range': 'Below 40', 'description': 'Reappear'},
        'U':  {'points': 0, 'marks_range': 'Absent',   'description': 'Absent'},
        'F':  {'points': 0, 'marks_range': 'Below 40', 'description': 'Fail'},
        'W':  {'points': 0, 'marks_range': 'N/A',      'description': 'Withdrawn'},
        'SA': {'points': 0, 'marks_range': 'N/A',      'description': 'Shortage of Attendance'},
        'AB': {'points': 0, 'marks_range': 'N/A',      'description': 'Absent'},
    }

    # R2013 uses a different grade scale (S, A, B, C, D, E)
    GRADE_SCALE_R2013 = {
        'S':  {'points': 10, 'marks_range': '91-100', 'description': 'Superior'},
        'A':  {'points': 9,  'marks_range': '81-90',  'description': 'Excellent'},
        'B':  {'points': 8,  'marks_range': '71-80',  'description': 'Very Good'},
        'C':  {'points': 7,  'marks_range': '61-70',  'description': 'Good'},
        'D':  {'points': 6,  'marks_range': '51-60',  'description': 'Satisfactory'},
        'E':  {'points': 5,  'marks_range': '45-50',  'description': 'Pass'},
        # Fail / Absent grades (same as R2017+)
        'RA': {'points': 0, 'marks_range': 'Below 45', 'description': 'Reappear'},
        'U':  {'points': 0, 'marks_range': 'Absent',   'description': 'Absent'},
        'F':  {'points': 0, 'marks_range': 'Below 45', 'description': 'Fail'},
        'W':  {'points': 0, 'marks_range': 'N/A',      'description': 'Withdrawn'},
        'SA': {'points': 0, 'marks_range': 'N/A',      'description': 'Shortage of Attendance'},
        'AB': {'points': 0, 'marks_range': 'N/A',      'description': 'Absent'},
    }
    
    # Class divisions based on CGPA (Regulation 2021)
    CLASS_DIVISIONS = [
        (8.5, 'Distinction'),
        (7.0, 'First Class'),
        (6.5, 'First Class (Lower)'),
        (6.0, 'Second Class'),
        (0.0, 'Pass Class')
    ]
    
    # Passing grades (contribute to CGPA) - includes all regulations
    PASSING_GRADES = ['O', 'S', 'A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'P']

    def _get_active_grade_scale(self) -> Dict:
        """Return the correct grade scale based on regulation."""
        if self.regulation in ('2013', '2008'):
            return self.GRADE_SCALE_R2013
        return self.GRADE_SCALE
    
    def __init__(self, curriculum_service=None, branch: str = "CSE", regulation: str = "2021"):
        """
        Initialize the CGPA calculator
        
        Args:
            curriculum_service: Optional CurriculumService instance for accurate credits
            branch: Student's branch (e.g., CSE, ECE, MECH)
            regulation: Regulation year (2017, 2021, 2025)
        """
        self.semesters: Dict[int, List[Subject]] = {}
        self.calculation_history = []
        self.curriculum_service = curriculum_service
        self.branch = branch.upper()
        self.regulation = str(regulation)
        
        # Initialize curriculum service if not provided
        if self.curriculum_service is None:
            try:
                from curriculum_service import get_curriculum_service
                self.curriculum_service = get_curriculum_service()
            except ImportError:
                pass
    
    def _lookup_credits(self, code: str, provided_credits: Optional[float] = None) -> float:
        """
        Lookup credits for a subject code using the curriculum service
        
        Priority:
        1. Use provided credits if valid (0 < credits <= 10)
        2. Look up from curriculum service with branch/regulation
        3. Fall back to pattern-based default (3 credits)
        
        Args:
            code: Subject code
            provided_credits: Credits provided by user/OCR
            
        Returns:
            float: Credits for the subject
        """
        # Use provided credits if valid
        if provided_credits is not None and 0 < provided_credits <= 10:
            return float(provided_credits)
        
        # Lookup from curriculum service
        if self.curriculum_service:
            try:
                result = self.curriculum_service.get_credits(code, self.branch, self.regulation)
                return result.credits
            except Exception:
                pass
        
        # Default fallback
        return 3.0
    
    def add_semester(self, semester: int, subjects_data: List[Dict]) -> bool:
        """
        Add complete semester data with subjects
        
        Args:
            semester: Semester number (1-8)
            subjects_data: List of subject dictionaries
                [{
                    'code': 'CS6303',
                    'name': 'Computer Architecture', # optional
                    'credits': 3,
                    'grade': 'B+',
                    'marks': 65 # optional
                }, ...]
        
        Returns:
            bool: Success status
        """
        try:
            subjects = []
            
            for subj_data in subjects_data:
                code = subj_data.get('code', '').upper()
                provided_credits = subj_data.get('credits')
                
                # Use curriculum service to lookup/validate credits
                credits = self._lookup_credits(code, provided_credits)
                
                # Create subject object
                subject = Subject(
                    code=code,
                    name=subj_data.get('name', ''),
                    credits=credits,
                    grade=subj_data.get('grade', '').upper(),
                    marks=subj_data.get('marks'),
                    original_semester=subj_data.get('original_semester')
                )
                
                # Calculate grade points and status
                self._calculate_subject_metrics(subject)
                subjects.append(subject)
            
            self.semesters[semester] = subjects
            return True
            
        except Exception as e:
            print(f"Error adding semester {semester}: {e}")
            return False
    
    def add_single_subject(self, semester: int, subject_data: Dict) -> bool:
        """Add or update a single subject in a semester"""
        try:
            if semester not in self.semesters:
                self.semesters[semester] = []
            
            code = subject_data.get('code', '').upper()
            provided_credits = subject_data.get('credits')
            
            # Use curriculum service to lookup/validate credits
            credits = self._lookup_credits(code, provided_credits)
            
            subject = Subject(
                code=code,
                name=subject_data.get('name', ''),
                credits=credits,
                grade=subject_data.get('grade', '').upper(),
                marks=subject_data.get('marks'),
                original_semester=subject_data.get('original_semester')
            )
            
            self._calculate_subject_metrics(subject)
            
            # Check if subject already exists (for revaluation)
            existing_subject = None
            for i, existing in enumerate(self.semesters[semester]):
                if existing.code == subject.code:
                    existing_subject = i
                    break
            
            if existing_subject is not None:
                # Update existing subject (revaluation case)
                old_subject = self.semesters[semester][existing_subject]
                subject.attempt = old_subject.attempt + 1
                self.semesters[semester][existing_subject] = subject
            else:
                # Add new subject
                self.semesters[semester].append(subject)
            
            return True
            
        except Exception as e:
            print(f"Error adding subject: {e}")
            return False
    
    def _calculate_subject_metrics(self, subject: Subject) -> None:
        """Calculate grade points, weighted points, and status for a subject"""
        grade = subject.grade.upper()
        scale = self._get_active_grade_scale()
        
        if grade in scale:
            subject.grade_points = scale[grade]['points']
            subject.weighted_points = subject.grade_points * subject.credits
            subject.status = 'PASS' if grade in self.PASSING_GRADES else 'FAIL'
        else:
            subject.grade_points = 0.0
            subject.weighted_points = 0.0
            subject.status = 'INVALID'
    
    def calculate_semester_gpa(self, semester: int, include_failures: bool = False) -> SemesterResult:
        """
        Calculate GPA for a specific semester (Anna University Rules)
        
        IMPORTANT: For Anna University, semester GPA only includes subjects that
        originally belong to that semester. Arrears cleared in this semester
        do NOT count toward this semester's GPA - they affect overall CGPA only.
        
        Args:
            semester: Semester number
            include_failures: Whether to include failed subjects in calculation (default: False)
        
        Returns:
            SemesterResult object with semester-specific analysis
        """
        if semester not in self.semesters:
            return SemesterResult(
                semester=semester, gpa=0.0, credits_attempted=0, credits_earned=0,
                total_points=0.0, subjects=[], passed_subjects=0, failed_subjects=0
            )
        
        subjects = self.semesters[semester]
        
        total_points = 0.0
        credits_attempted = 0
        credits_earned = 0
        passed_subjects = 0
        failed_subjects = 0
        current_semester_subjects = []
        arrear_subjects = []
        
        # Separate current semester subjects from arrear subjects
        for subject in subjects:
            # Use OCR-detected original_semester if available, otherwise fallback to code pattern
            if subject.original_semester is not None:
                subject_sem = subject.original_semester
            else:
                subject_sem = self._determine_subject_semester(subject.code, semester)
            
            if subject_sem == semester:
                # This is a current semester subject
                current_semester_subjects.append(subject)
                credits_attempted += subject.credits
                
                if include_failures or subject.status == 'PASS':
                    total_points += subject.weighted_points
                    credits_earned += subject.credits
                
                if subject.status == 'PASS':
                    passed_subjects += 1
                elif subject.status == 'FAIL':
                    failed_subjects += 1
            else:
                # This is an arrear subject from another semester
                arrear_subjects.append(subject)
        
        # GPA calculation: Only use current semester subjects
        gpa = total_points / credits_earned if credits_earned > 0 else 0.0
        
        # For reporting, include all subjects but mark arrears separately
        all_subjects = current_semester_subjects + arrear_subjects
        
        return SemesterResult(
            semester=semester,
            gpa=round(gpa, 2),
            credits_attempted=credits_attempted,  # Only current semester
            credits_earned=credits_earned,        # Only current semester
            total_points=total_points,            # Only current semester
            subjects=all_subjects,                # All subjects for display
            passed_subjects=passed_subjects,      # Only current semester
            failed_subjects=failed_subjects       # Only current semester
        )
    
    def _determine_subject_semester(self, subject_code: str, current_semester: int) -> int:
        """
        Determine which semester a subject originally belongs to
        
        Args:
            subject_code: Subject code (e.g., CS3301, MA6151)
            current_semester: Current semester number
            
        Returns:
            Original semester number for the subject
        """
        # First, try to get semester from CurriculumService (official data)
        if self.curriculum_service:
            curriculum_sem = self.curriculum_service.get_semester(subject_code, 'CSE')
            if curriculum_sem is not None:
                return curriculum_sem
        
        try:
            # Fallback: Extract semester from subject code pattern
            # Anna University pattern: CS3xxx = Semester 3, MA6xxx = Semester 6, etc.
            import re
            match = re.search(r'[A-Z]{2,4}(\d)', subject_code)
            if match:
                code_semester = int(match.group(1))
                if 1 <= code_semester <= 8:
                    return code_semester
            
            # If we can't determine from code, assume it belongs to current semester
            # (This handles electives which don't have fixed semesters)
            return current_semester
            
        except Exception:
            return current_semester
    
    def calculate_overall_cgpa(self, include_failures: bool = False) -> float:
        """
        Calculate overall CGPA across all semesters
        
        Args:
            include_failures: Whether to include failed subjects in calculation
        
        Returns:
            Overall CGPA value
        """
        total_points = 0.0
        total_credits = 0
        
        for semester in sorted(self.semesters.keys()):
            semester_result = self.calculate_semester_gpa(semester, include_failures)
            total_points += semester_result.total_points
            total_credits += semester_result.credits_earned
        
        cgpa = total_points / total_credits if total_credits > 0 else 0.0
        return round(cgpa, 2)
    
    def calculate_percentage(self, cgpa: float) -> float:
        """Convert CGPA to percentage using Anna University formula"""
        return round(cgpa * 10, 1)
    
    def get_class_division(self, cgpa: float, has_arrears: bool = False) -> str:
        """
        Determine class division based on Anna University Regulation 2021 rules
        
        Args:
            cgpa: Overall CGPA
            has_arrears: Whether student has ever had arrears (even if cleared)
        
        Returns:
            Class division string with arrear consideration
        """
        # Anna University Regulation 2021 Classification Rules
        
        # First Class with Distinction: REQUIRES no arrears EVER (8.50+ CGPA)
        if cgpa >= 8.5 and not has_arrears:
            return "First Class with Distinction"
        
        # First Class: Arrears allowed if cleared within time (6.50+ CGPA)
        elif cgpa >= 6.5:
            if has_arrears:
                return "First Class (with arrear history)"
            else:
                return "First Class"
        
        # Second Class: All other passing students
        elif cgpa >= 4.0:  # Minimum passing CGPA
            return "Second Class"
        
        # Below passing
        else:
            return "Fail"
    
    def has_arrear_history(self) -> bool:
        """
        Check if student has ever had arrears (even if cleared later)
        
        Returns:
            True if any subject was ever failed, False otherwise
        """
        for semester in self.semesters.values():
            for subject in semester:
                # Check if this subject was ever failed (even if later passed via revaluation)
                if subject.attempt > 1 or subject.status == 'FAIL':
                    return True
        return False
    
    def get_current_arrears(self) -> List[Subject]:
        """Get list of current arrear subjects (RA/U/W grades)"""
        arrears = []
        
        for semester in self.semesters.values():
            for subject in semester:
                if subject.status == 'FAIL':
                    arrears.append(subject)
        
        return arrears
    
    def generate_complete_report(self) -> CGPAReport:
        """
        Generate comprehensive CGPA report following Anna University rules
        
        Returns:
            Complete CGPAReport object with proper GPA/CGPA distinction
        """
        # Calculate semester-wise results
        semester_results = []
        total_credits_attempted = 0
        total_credits_earned = 0
        total_subjects = 0
        passed_subjects = 0
        failed_subjects = 0
        
        # Track all subjects across semesters for CGPA calculation
        all_subjects_for_cgpa = {}  # {subject_code: latest_subject_object}
        
        for semester in sorted(self.semesters.keys()):
            result = self.calculate_semester_gpa(semester)
            semester_results.append(result)
            
            # For semester totals (only current semester subjects)
            total_credits_attempted += result.credits_attempted
            total_credits_earned += result.credits_earned
            
            # Track subjects for CGPA (include arrears with latest grades)
            for subject in result.subjects:
                # Use latest grade for each subject (handles revaluations)
                if subject.code not in all_subjects_for_cgpa or subject.attempt > all_subjects_for_cgpa[subject.code].attempt:
                    all_subjects_for_cgpa[subject.code] = subject
        
        # Calculate overall CGPA using all unique subjects with latest grades
        cgpa_total_points = 0.0
        cgpa_total_credits = 0
        total_subjects = len(all_subjects_for_cgpa)
        passed_subjects = 0
        failed_subjects = 0
        
        for subject in all_subjects_for_cgpa.values():
            if subject.status == 'PASS':
                cgpa_total_points += subject.weighted_points
                cgpa_total_credits += subject.credits
                passed_subjects += 1
            else:
                failed_subjects += 1
        
        cgpa = cgpa_total_points / cgpa_total_credits if cgpa_total_credits > 0 else 0.0
        percentage = self.calculate_percentage(cgpa)
        
        # Check arrear history
        has_arrears = self.has_arrear_history()
        class_division = self.get_class_division(cgpa, has_arrears)
        
        # Create comprehensive report
        report = CGPAReport(
            cgpa=round(cgpa, 2),
            percentage=percentage,
            class_division=class_division,
            total_semesters=len(self.semesters),
            total_credits_attempted=total_credits_attempted,
            total_credits_earned=cgpa_total_credits,  # Use CGPA credits
            total_subjects=total_subjects,
            passed_subjects=passed_subjects,
            failed_subjects=failed_subjects,
            current_arrears=failed_subjects,  # Current arrears = failed subjects
            semester_results=semester_results,
            calculation_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        
        return report
    
    def print_detailed_report(self) -> str:
        """Generate formatted text report following Anna University rules"""
        report = self.generate_complete_report()
        
        output = []
        output.append("=" * 80)
        output.append("ANNA UNIVERSITY CGPA REPORT (Regulation 2021)")
        output.append("=" * 80)
        output.append("")
        
        # Overall Statistics
        output.append("📊 OVERALL STATISTICS:")
        output.append(f"  CGPA: {report.cgpa} (Cumulative - All Semesters)")
        output.append(f"  Percentage: {report.percentage}%")
        output.append(f"  Classification: {report.class_division}")
        output.append(f"  Total Credits Earned: {report.total_credits_earned}")
        output.append(f"  Total Subjects: {report.total_subjects}")
        output.append(f"  Passed: {report.passed_subjects}, Failed: {report.failed_subjects}")
        if report.current_arrears > 0:
            output.append(f"  ⚠️  Current Arrears: {report.current_arrears}")
        
        # Anna University specific notes
        if "arrear history" in report.class_division.lower():
            output.append("")
            output.append("📝 ANNA UNIVERSITY CLASSIFICATION NOTES:")
            output.append("  • First Class with Distinction requires no arrears EVER")
            output.append("  • You achieved First Class despite arrear history")
            output.append("  • Arrears must be cleared within 5 years for First Class")
        
        output.append("")
        
        # Semester-wise breakdown
        output.append("=" * 80)
        output.append("SEMESTER-WISE BREAKDOWN:")
        output.append("=" * 80)
        output.append("")
        
        for sem_result in report.semester_results:
            output.append(f"Semester {sem_result.semester}:")
            output.append(f"  GPA: {sem_result.gpa} (Current Semester Subjects Only)")
            output.append(f"  Credits: {sem_result.credits_earned} (Current Semester)")
            
            # Separate current semester subjects from arrears
            current_sem_subjects = []
            arrear_subjects = []
            
            for subject in sem_result.subjects:
                subject_sem = self._determine_subject_semester(subject.code, sem_result.semester)
                if subject_sem == sem_result.semester:
                    current_sem_subjects.append(subject)
                else:
                    arrear_subjects.append(subject)
            
            if current_sem_subjects:
                output.append(f"  Current Semester Subjects ({len(current_sem_subjects)}):")
                for subject in current_sem_subjects:
                    status_icon = "✅" if subject.status == "PASS" else "❌"
                    marks_str = f" (marks: {subject.marks})" if subject.marks else ""
                    output.append(f"    {status_icon} {subject.code}: {subject.grade} ({subject.grade_points}) × {subject.credits} credits = {subject.weighted_points}{marks_str}")
            
            if arrear_subjects:
                output.append(f"  Arrear Subjects Cleared ({len(arrear_subjects)}):")
                for subject in arrear_subjects:
                    status_icon = "🔄" if subject.status == "PASS" else "❌"
                    marks_str = f" (marks: {subject.marks})" if subject.marks else ""
                    orig_sem = self._determine_subject_semester(subject.code, sem_result.semester)
                    output.append(f"    {status_icon} {subject.code}: {subject.grade} ({subject.grade_points}) × {subject.credits} credits [Originally Sem {orig_sem}]{marks_str}")
            
            output.append("")
        
        # Summary
        output.append("=" * 80)
        output.append("✅ Final Results (Anna University Regulation 2021):")
        output.append(f"  CGPA: {report.cgpa} (All semesters combined)")
        output.append(f"  Percentage: {report.percentage}%")
        output.append(f"  Class: {report.class_division}")
        output.append("")
        output.append("📋 Calculation Method:")
        output.append("  • GPA: Only current semester subjects")
        output.append("  • CGPA: All subjects with latest grades (includes cleared arrears)")
        output.append("  • Classification: Based on CGPA and arrear history")
        output.append("")
        
        return "\n".join(output)
    
    # Backward compatibility methods for existing API
    
    def calculate_cgpa_from_grades(self, grades_data: List[Dict], semester: int = 1) -> Dict:
        """
        Backward compatible method for single-call CGPA calculation
        
        Supports enriched grades with is_arrear flag for accurate GPA/CGPA calculation.
        Handles arrears correctly by deduplicating subjects across attempts.
        """
        try:
            # Clear existing data
            self.semesters.clear()
            
            # 1. Deduplicate subjects for CGPA
            best_attempts = {}
            scale = self._get_active_grade_scale()
            ever_failed = False
            
            for grade_info in grades_data:
                code = grade_info.get('subject', '').upper()
                if not code: continue
                
                grade = grade_info.get('grade', '').upper()
                is_passing = grade in self.PASSING_GRADES
                if not is_passing: ever_failed = True
                
                if code not in best_attempts:
                    best_attempts[code] = grade_info
                else:
                    existing_grade = best_attempts[code].get('grade', '').upper()
                    existing_passing = existing_grade in self.PASSING_GRADES
                    
                    if not existing_passing and is_passing:
                        best_attempts[code] = grade_info
                    elif existing_passing == is_passing:
                        if best_attempts[code].get('is_arrear') and not grade_info.get('is_arrear'):
                            best_attempts[code] = grade_info

            # 2. Separate for GPA and Tracking
            current_sem_subjects = []
            arrear_subjects_list = []
            
            for code, info in best_attempts.items():
                subject_data = {
                    'code': code,
                    'credits': info.get('credits', 3),
                    'grade': info.get('grade', '').upper(),
                    'marks': info.get('marks'),
                    'original_semester': info.get('original_semester')
                }
                is_arrear = info.get('is_arrear', False)
                if not is_arrear and 'is_arrear' not in info:
                    orig_sem = info.get('original_semester')
                    if orig_sem is not None and orig_sem != semester:
                        is_arrear = True
                
                if is_arrear:
                    arrear_subjects_list.append(subject_data)
                else:
                    current_sem_subjects.append(subject_data)

            self.add_semester(semester, current_sem_subjects + arrear_subjects_list)
            
            # 3. GPA Calculation
            sem_total_points = 0.0
            sem_total_credits = 0
            for subj_data in current_sem_subjects:
                grade = subj_data['grade'].upper()
                credits = float(subj_data['credits'])
                if grade in scale:
                    sem_total_credits += credits
                    if grade in self.PASSING_GRADES:
                        sem_total_points += (scale[grade]['points'] * credits)
            
            sem_gpa = sem_total_points / sem_total_credits if sem_total_credits > 0 else 0.0
            
            # 4. CGPA & Stats
            cgpa_total_points = 0.0
            cgpa_total_credits = 0
            total_passed = 0
            total_failed = 0
            subjects_dict = {}
            
            for code, info in best_attempts.items():
                grade = info.get('grade', '').upper()
                credits = float(info.get('credits', 3))
                is_passing = grade in self.PASSING_GRADES
                
                grade_points = scale.get(grade, {}).get('points', 0)
                weighted = grade_points * credits
                
                if is_passing:
                    cgpa_total_points += weighted
                    cgpa_total_credits += credits
                    total_passed += 1
                else:
                    total_failed += 1
                
                subjects_dict[code] = {
                    'grade': grade,
                    'grade_points': grade_points,
                    'credits': credits,
                    'weighted': weighted,
                    'status': 'PASS' if is_passing else 'FAIL',
                    'is_arrear': info.get('is_arrear', False),
                    'original_semester': info.get('original_semester')
                }
                if info.get('marks'): subjects_dict[code]['marks'] = info['marks']
            
            cgpa = cgpa_total_points / cgpa_total_credits if cgpa_total_credits > 0 else 0.0
            class_division = self.get_class_division(cgpa, ever_failed)
            
            return {
                'gpa': round(sem_gpa, 2),
                'cgpa': round(cgpa, 2),
                'percentage': f"{round(cgpa * 10, 1)}%",
                'class': class_division,
                'total_subjects': len(best_attempts),
                'current_semester_subjects': len(current_sem_subjects),
                'arrear_subjects': len(arrear_subjects_list),
                'passed_subjects': total_passed,
                'failed_subjects': total_failed,
                'semester_credits': sem_total_credits,
                'total_credits': cgpa_total_credits,
                'subjects': subjects_dict
            }
            
        except Exception as e:
            import traceback
            print(f"Error in calculate_cgpa_from_grades: {e}")
            print(traceback.format_exc())
            return {
                'gpa': 0.0, 'cgpa': 0.0, 'percentage': '0.0%', 'class': 'Error',
                'total_subjects': 0, 'passed_subjects': 0, 'failed_subjects': 0, 'subjects': {}
            }
