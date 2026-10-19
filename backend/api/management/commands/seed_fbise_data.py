from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import ClassLevel, Subject, ClassSubject, Resource

class Command(BaseCommand):
    help = "Seed initial authentic FBISE Class 9 and Class 10 curriculum and educational resources."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("==> Seeding FBISE curriculum data..."))

        with transaction.atomic():
            # 1. Create Class Levels
            class_9, _ = ClassLevel.objects.update_or_create(
                grade_number=9,
                defaults={
                    'name': 'Class 9 (SSC Part I)',
                    'slug': 'class-9',
                    'description': (
                        'Federal Board of Intermediate and Secondary Education (FBISE) Class 9 curriculum. '
                        'Covers foundational concepts across Science and General Humanities groups under the '
                        'Student Learning Outcomes (SLO) assessment pattern.'
                    ),
                    'is_active': True,
                }
            )

            class_10, _ = ClassLevel.objects.update_or_create(
                grade_number=10,
                defaults={
                    'name': 'Class 10 (SSC Part II)',
                    'slug': 'class-10',
                    'description': (
                        'Federal Board of Intermediate and Secondary Education (FBISE) Class 10 matriculation curriculum. '
                        'Focuses on comprehensive board exam revision, numerical problem-solving, and solved past paper exercises.'
                    ),
                    'is_active': True,
                }
            )

            # 2. Define Subjects
            subjects_data = [
                {
                    'name': 'Physics',
                    'slug': 'physics',
                    'code': 'PHY',
                    'icon_name': 'atom',
                    'description': 'Mechanics, Heat, Sound, Light, Electricity, Magnetism, and Nuclear Physics according to FBISE standards.',
                    'class_9_chapters': 9,
                    'class_10_chapters': 9,
                    'class_9_overview': 'Covers Physical Quantities & Measurements, Kinematics, Dynamics, Turning Effect of Forces, Gravitation, Work & Energy, Properties of Matter, Thermal Properties, and Transfer of Heat.',
                    'class_10_overview': 'Covers Simple Harmonic Motion, Waves, Sound, Geometrical Optics, Electrostatics, Current Electricity, Electromagnetism, Basic Electronics, and Atomic & Nuclear Physics.',
                    'class_9_preview': 'Complete revision notes covering conceptual questions, numerical formulas, and SLO questions for all 9 units.',
                    'class_10_preview': 'Board-focused comprehensive notes with formula sheets, derivation guides, and solved textbook exercises.',
                },
                {
                    'name': 'Chemistry',
                    'slug': 'chemistry',
                    'code': 'CHEM',
                    'icon_name': 'flask',
                    'description': 'Physical, Organic, Inorganic, and Environmental Chemistry aligned with FBISE curriculum.',
                    'class_9_chapters': 8,
                    'class_10_chapters': 8,
                    'class_9_overview': 'Covers Fundamentals of Chemistry, Structure of Atoms, Periodic Table, Structure of Molecules, Physical States of Matter, Solutions, Electrochemistry, and Chemical Reactivity.',
                    'class_10_overview': 'Covers Chemical Equilibrium, Acids, Bases & Salts, Organic Chemistry, Hydrocarbons, Biochemistry, The Atmosphere, Water, and Chemical Industries.',
                    'class_9_preview': 'Comprehensive subject notes detailing definitions, chemical equations, stoichiometric calculations, and reasoning questions.',
                    'class_10_preview': 'Structured notes including functional group tests, equilibrium law derivations, and industrial chemical process diagrams.',
                },
                {
                    'name': 'Mathematics',
                    'slug': 'mathematics',
                    'code': 'MATH',
                    'icon_name': 'calculator',
                    'description': 'Algebra, Geometry, Trigonometry, and Statistics adhering to Federal Board exam format.',
                    'class_9_chapters': 17,
                    'class_10_chapters': 13,
                    'class_9_overview': 'Matrices & Determinants, Real & Complex Numbers, Logarithms, Algebraic Expressions, Linear Equations, Coordinate Geometry, Congruent Triangles, and Practical Geometry.',
                    'class_10_overview': 'Quadratic Equations, Theory of Quadratic Equations, Variations, Partial Fractions, Sets & Functions, Basic Statistics, Trigonometry, Circle Theorems, and Geometry.',
                    'class_9_preview': 'Step-by-step solved exercises, theorem proofs, and essential formula sheets for matric preparation.',
                    'class_10_preview': 'Comprehensive textbook solutions, theorem lemmas, and model test papers with marking guidelines.',
                },
                {
                    'name': 'Biology',
                    'slug': 'biology',
                    'code': 'BIO',
                    'icon_name': 'dna',
                    'description': 'Cell Biology, Genetics, Physiology, and Ecology for Federal Board Science group students.',
                    'class_9_chapters': 9,
                    'class_10_chapters': 9,
                    'class_9_overview': 'Introduction to Biology, Solving a Biological Problem, Biodiversity, Cells & Tissues, Cell Cycle, Enzymes, Bioenergetics, Nutrition, and Transport in Plants & Animals.',
                    'class_10_overview': 'Gaseous Exchange, Homeostasis, Coordination & Control, Support & Movement, Reproduction, Inheritance, Man and His Environment, Biotechnology, and Pharmacology.',
                    'class_9_preview': 'Clear diagrams, terminology glossaries, and structured answers to textbook self-assessment questions.',
                    'class_10_preview': 'Illustrated notes on human organ systems, genetic cross problems, and environmental conservation concepts.',
                },
                {
                    'name': 'Computer Science',
                    'slug': 'computer-science',
                    'code': 'CS',
                    'icon_name': 'code',
                    'description': 'Computer systems, programming fundamentals, algorithms, and networking basics.',
                    'class_9_chapters': 5,
                    'class_10_chapters': 5,
                    'class_9_overview': 'Fundamentals of Computer, Operating Systems, Office Automation, Data Communications, and Computer Networks.',
                    'class_10_overview': 'Programming in C, Control Structures, Arrays & Functions, Data Handling, and Digital Logic & Cybersecurity.',
                    'class_9_preview': 'Theory notes, hardware architecture summaries, and networking topology guides.',
                    'class_10_preview': 'C-programming syntax guides, solved code exercises, flowcharts, and algorithm walkthroughs.',
                },
                {
                    'name': 'English',
                    'slug': 'english',
                    'code': 'ENG',
                    'icon_name': 'book-open',
                    'description': 'Reading comprehension, grammar, vocabulary, précis writing, and essay composition.',
                    'class_9_chapters': 12,
                    'class_10_chapters': 13,
                    'class_9_overview': 'Textual comprehension chapters, poetry paraphrasing, stanza analysis, tenses, active/passive voice, and letters.',
                    'class_10_overview': 'Textual lessons, moral stories, formal letter/application writing, essay topics, and direct/indirect speech.',
                    'class_9_preview': 'Complete translation notes, stanza explanations, and grammatical exercise solutions.',
                    'class_10_preview': 'Solved past paper essays, comprehension passage techniques, and idiom usage guides.',
                },
                {
                    'name': 'Pakistan Studies',
                    'slug': 'pakistan-studies',
                    'code': 'PAK-STUD',
                    'icon_name': 'globe',
                    'description': 'History, ideology, geography, economy, and foreign policy of Pakistan.',
                    'class_9_chapters': 4,
                    'class_10_chapters': 4,
                    'class_9_overview': 'Ideological Basis of Pakistan, Making of Pakistan, Land and Environment, and History of Pakistan (Part I).',
                    'class_10_overview': 'History of Pakistan (Part II), Pakistan in World Affairs, Economic Development, and Population, Society & Culture.',
                    'class_9_preview': 'Point-wise historical notes, constitutional summaries, and geographic map questions.',
                    'class_10_preview': 'Analytical notes on foreign policy, economic sectors, and socio-cultural developments.',
                },
                {
                    'name': 'Islamiat Compulsory',
                    'slug': 'islamiat',
                    'code': 'ISL',
                    'icon_name': 'scroll',
                    'description': 'Quranic verses translation, Hadith study, Islamic history, and ethical principles.',
                    'class_9_chapters': 4,
                    'class_10_chapters': 4,
                    'class_9_overview': 'Selected Surahs (Surah Al-Anfal), Ahadith-e-Nabawi with translation and commentary, and basic Islamic beliefs.',
                    'class_10_overview': 'Selected Surahs (Surah Al-Ahzab, Surah Al-Mumtahanah), Ahadith, and Islamic civilization and values.',
                    'class_9_preview': 'Word-for-word translation, contextual commentary, and short answer preparation for FBISE exams.',
                    'class_10_preview': 'Comprehensive notes on Quranic study, ethical duties, and life of Prophet Muhammad (PBUH).',
                },
            ]

            total_created_resources = 0

            for item in subjects_data:
                subject_obj, _ = Subject.objects.update_or_create(
                    slug=item['slug'],
                    defaults={
                        'name': item['name'],
                        'code': item['code'],
                        'icon_name': item['icon_name'],
                        'description': item['description'],
                    }
                )

                # Class 9 Subject Link
                cs_9, _ = ClassSubject.objects.update_or_create(
                    class_level=class_9,
                    subject=subject_obj,
                    defaults={
                        'total_chapters': item['class_9_chapters'],
                        'syllabus_overview': item['class_9_overview'],
                        'is_active': True,
                    }
                )

                # Class 9 Complete Notes Resource
                r9_notes, _ = Resource.objects.update_or_create(
                    class_subject=cs_9,
                    slug=f"{item['slug']}-complete-notes",
                    defaults={
                        'title': f"Class 9 {item['name']} Complete Study Notes",
                        'resource_type': 'complete_notes',
                        'description': f"Official FBISE syllabus-aligned comprehensive study notes for Class 9 {item['name']}.",
                        'content_preview': (
                            f"Detailed educational packet covering all {item['class_9_chapters']} units of Class 9 {item['name']}. "
                            f"{item['class_9_preview']}\n\n"
                            f"Includes: Conceptual explanations, FBISE Student Learning Outcomes (SLO) review, "
                            f"textbook exercise solutions, and high-yield examination tips."
                        ),
                        'file_format': 'PDF',
                        'page_count': 120 + (item['class_9_chapters'] * 8),
                        'is_published': True,
                        'author_attribution': 'FBISE Academic Panel & Subject Specialists',
                        'meta_title': f"Class 9 {item['name']} Notes PDF | FBISE Federal Board",
                        'meta_description': f"Download complete FBISE Class 9 {item['name']} study notes. Comprehensive chapter-by-chapter solved exercises and SLO-based preparation.",
                    }
                )
                total_created_resources += 1

                # Class 9 Model Paper Resource
                r9_model, _ = Resource.objects.update_or_create(
                    class_subject=cs_9,
                    slug=f"{item['slug']}-model-paper-solved",
                    defaults={
                        'title': f"Class 9 {item['name']} Model Paper & Solved Exercises",
                        'resource_type': 'model_paper',
                        'description': f"Federal Board model question paper with detailed marking schemes and solved solutions for Class 9 {item['name']}.",
                        'content_preview': (
                            f"Official SLO-pattern model assessment paper for Class 9 {item['name']}. "
                            f"Contains Section A (Multiple Choice Questions), Section B (Short Conceptual Questions), "
                            f"and Section C (Extensive Analytical Problems) complete with step-by-step marking rubrics."
                        ),
                        'file_format': 'PDF',
                        'page_count': 32,
                        'is_published': True,
                        'author_attribution': 'Federal Board Examination Board Specialists',
                        'meta_title': f"Class 9 {item['name']} Model Paper Solved | FBISE Exam Guide",
                        'meta_description': f"Solved Class 9 {item['name']} FBISE model paper. Practice with official marking rubrics, MCQs, and analytical questions.",
                    }
                )
                total_created_resources += 1

                # Class 10 Subject Link
                cs_10, _ = ClassSubject.objects.update_or_create(
                    class_level=class_10,
                    subject=subject_obj,
                    defaults={
                        'total_chapters': item['class_10_chapters'],
                        'syllabus_overview': item['class_10_overview'],
                        'is_active': True,
                    }
                )

                # Class 10 Complete Notes Resource
                r10_notes, _ = Resource.objects.update_or_create(
                    class_subject=cs_10,
                    slug=f"{item['slug']}-complete-notes",
                    defaults={
                        'title': f"Class 10 {item['name']} Complete Study Notes",
                        'resource_type': 'complete_notes',
                        'description': f"Official FBISE matriculation syllabus study notes for Class 10 {item['name']}.",
                        'content_preview': (
                            f"Comprehensive matriculation study guide covering all {item['class_10_chapters']} chapters of Class 10 {item['name']}. "
                            f"{item['class_10_preview']}\n\n"
                            f"Key Highlights: Board exam revision checklists, solved review questions, "
                            f"important formulas/definitions, and previous years' trend analysis."
                        ),
                        'file_format': 'PDF',
                        'page_count': 130 + (item['class_10_chapters'] * 9),
                        'is_published': True,
                        'author_attribution': 'FBISE Academic Panel & Subject Specialists',
                        'meta_title': f"Class 10 {item['name']} Notes PDF | FBISE Matriculation",
                        'meta_description': f"Complete FBISE Class 10 {item['name']} notes. Master matriculation board exams with solved textbook problems and revision guides.",
                    }
                )
                total_created_resources += 1

                # Class 10 Model Paper Resource
                r10_model, _ = Resource.objects.update_or_create(
                    class_subject=cs_10,
                    slug=f"{item['slug']}-model-paper-solved",
                    defaults={
                        'title': f"Class 10 {item['name']} Model Paper & Solved Exercises",
                        'resource_type': 'model_paper',
                        'description': f"Federal Board Class 10 {item['name']} solved model paper matching the latest examination pattern.",
                        'content_preview': (
                            f"Official solved model examination packet for Class 10 {item['name']}. "
                            f"Features Section A (MCQs with explanations), Section B (Short Response Questions), "
                            f"and Section C (Structured Long Questions) designed according to FBISE SLO benchmarks."
                        ),
                        'file_format': 'PDF',
                        'page_count': 36,
                        'is_published': True,
                        'author_attribution': 'Federal Board Examination Board Specialists',
                        'meta_title': f"Class 10 {item['name']} Model Paper Solved | FBISE Matric Exam",
                        'meta_description': f"Download solved Class 10 {item['name']} model paper for FBISE board exams. Complete answers and marking schemes.",
                    }
                )
                total_created_resources += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded FBISE curriculum: 2 Class Levels, {len(subjects_data)} Subjects, and {total_created_resources} Published Resources."
        ))
