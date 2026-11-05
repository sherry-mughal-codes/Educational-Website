from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from api.models import (
    ClassLevel, Subject, ClassSubject, Chapter,
    PracticeTopic, Question, QuestionOption, QuestionAcceptedAnswer
)

class Command(BaseCommand):
    help = "Seed realistic FBISE Class 9 and Class 10 curriculum chapters, practice topics, and interactive questions."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("==> Seeding FBISE interactive practice curriculum & questions..."))

        with transaction.atomic():
            # Ensure Class 9 and Class 10 exist
            c9 = ClassLevel.objects.filter(grade_number=9).first()
            c10 = ClassLevel.objects.filter(grade_number=10).first()

            if not c9 or not c10:
                self.stderr.write("Class 9 or 10 not found. Run seed_fbise_data first.")
                return

            # Helper to get ClassSubject
            def get_cs(class_obj, sub_slug):
                return ClassSubject.objects.filter(class_level=class_obj, subject__slug=sub_slug).first()

            # Data structure for chapters, topics, and questions
            seed_data = [
                # -------------------------------------------------------------
                # CLASS 9 PHYSICS
                # -------------------------------------------------------------
                {
                    "class": c9,
                    "subject_slug": "physics",
                    "chapters": [
                        {
                            "number": 1,
                            "title": "Physical Quantities and Measurement",
                            "slug": "physical-quantities-and-measurement",
                            "overview": "Base and derived SI units, prefixes, scientific notation, and measuring instruments like vernier callipers and screw gauge.",
                            "topics": [
                                {
                                    "title": "SI Base Units and Standard Prefixes",
                                    "slug": "si-base-units-and-prefixes",
                                    "description": "Master the 7 fundamental SI units and metric prefixes (kilo, mega, micro, nano).",
                                    "difficulty": "beginner",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "Which of the following is a base quantity in the International System of Units (SI)?",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "In the SI system, there are seven base physical quantities: length, mass, time, electric current, thermodynamic temperature, amount of substance, and luminous intensity. Electric current is a fundamental base quantity, whereas velocity, force, and work are derived quantities.",
                                            "options": [
                                                {"text": "Electric Current", "is_correct": True},
                                                {"text": "Velocity", "is_correct": False},
                                                {"text": "Force", "is_correct": False},
                                                {"text": "Work Done", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "true_false",
                                            "prompt": "The prefix 'micro' (μ) represents a factor of 10^-6.",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "True. In the SI metric prefix system: milli = 10^-3, micro (μ) = 10^-6, and nano = 10^-9.",
                                            "options": [
                                                {"text": "True", "is_correct": True},
                                                {"text": "False", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "fill_blank",
                                            "prompt": "The standard SI unit for thermodynamic temperature is the ________.",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "The SI base unit of thermodynamic temperature is the Kelvin (K), named after Lord Kelvin. Celsius and Fahrenheit are derived scales.",
                                            "accepted": ["kelvin", "Kelvin", "K"]
                                        },
                                        {
                                            "type": "short_answer",
                                            "prompt": "What is the least count of a standard metric Vernier Calliper with 10 vernier divisions in millimeters?",
                                            "points": 15,
                                            "difficulty": "intermediate",
                                            "explanation": "The least count of a standard vernier calliper is the smallest division on the main scale (1 mm) divided by the number of divisions on the vernier scale (10), which equals 0.1 mm (or 0.01 cm).",
                                            "accepted": ["0.1 mm", "0.1mm", "0.1", "0.01 cm", "0.01cm"]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "number": 2,
                            "title": "Kinematics",
                            "slug": "kinematics",
                            "overview": "Rest, motion, scalar vs vector quantities, equations of uniform acceleration, and free-fall motion under gravity.",
                            "topics": [
                                {
                                    "title": "Differentiating Scalars and Vectors",
                                    "slug": "scalars-and-vectors",
                                    "description": "Identify magnitude, direction, and physical characteristics of scalar and vector physical quantities.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "Which of the following physical quantities is a vector?",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "Displacement is a vector quantity because it possesses both magnitude and a specific directional orientation (shortest distance between initial and final position). Speed, distance, and mass are scalar quantities.",
                                            "options": [
                                                {"text": "Displacement", "is_correct": True},
                                                {"text": "Speed", "is_correct": False},
                                                {"text": "Distance", "is_correct": False},
                                                {"text": "Mass", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "fill_blank",
                                            "prompt": "The rate of change of displacement with respect to time is defined as ________.",
                                            "points": 10,
                                            "difficulty": "intermediate",
                                            "explanation": "Velocity is defined as the time rate of displacement (v = Δd / Δt). The time rate of distance is speed.",
                                            "accepted": ["velocity", "Velocity"]
                                        },
                                        {
                                            "type": "true_false",
                                            "prompt": "An object moving with uniform circular speed has zero acceleration.",
                                            "points": 15,
                                            "difficulty": "intermediate",
                                            "explanation": "False. Even though the scalar speed is constant, the direction of motion is constantly changing along the tangent, which generates a continuous centripetal acceleration directed toward the center.",
                                            "options": [
                                                {"text": "False", "is_correct": True},
                                                {"text": "True", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "short_answer",
                                            "prompt": "A car accelerates from rest at 2 m/s^2 for 5 seconds. What is its final velocity in m/s?",
                                            "points": 15,
                                            "difficulty": "intermediate",
                                            "explanation": "Using the first equation of motion: v_f = v_i + a*t. Given v_i = 0 m/s, a = 2 m/s^2, t = 5 s, we calculate v_f = 0 + (2)(5) = 10 m/s.",
                                            "accepted": ["10 m/s", "10m/s", "10"]
                                        }
                                    ]
                                },
                                {
                                    "title": "Equations of Uniformly Accelerated Motion",
                                    "slug": "equations-of-motion",
                                    "description": "Solve numerical problems using the three equations of motion (v_f = v_i + at, S = v_i t + 1/2 at^2, 2aS = v_f^2 - v_i^2).",
                                    "difficulty": "advanced",
                                    "order": 2,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "Which equation represents the distance covered under uniform acceleration when time is not given?",
                                            "points": 15,
                                            "difficulty": "intermediate",
                                            "explanation": "The 3rd equation of motion is 2aS = v_f^2 - v_i^2. It relates acceleration, displacement, and velocities without requiring the elapsed time variable t.",
                                            "options": [
                                                {"text": "2aS = v_f^2 - v_i^2", "is_correct": True},
                                                {"text": "S = v_i t + 1/2 a t^2", "is_correct": False},
                                                {"text": "v_f = v_i + at", "is_correct": False},
                                                {"text": "S = (v_f - v_i) / t", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "fill_blank",
                                            "prompt": "A stone dropped from the top of a tower falls freely under gravity with an acceleration approximately equal to ________ m/s^2 near Earth's surface.",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "Near the surface of the Earth, the acceleration due to gravity (g) is approximately 9.8 m/s^2 (or 10 m/s^2 for approximate calculations in FBISE standard problems).",
                                            "accepted": ["9.8", "9.8 m/s^2", "9.8m/s2", "10", "10 m/s^2"]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "number": 3,
                            "title": "Dynamics",
                            "slug": "dynamics",
                            "overview": "Newton's laws of motion, momentum, friction, and centripetal force.",
                            "topics": [
                                {
                                    "title": "Newton's Laws of Motion & Momentum",
                                    "slug": "newtons-laws-and-momentum",
                                    "description": "Understand inertia, F = ma, action-reaction pairs, and the law of conservation of momentum.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "Newton's First Law of Motion is also known as the Law of:",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "Newton's First Law of Motion states that an object remains at rest or in uniform motion unless acted upon by a net external force. This property of resisting changes in state of motion is termed Inertia.",
                                            "options": [
                                                {"text": "Inertia", "is_correct": True},
                                                {"text": "Acceleration", "is_correct": False},
                                                {"text": "Gravitation", "is_correct": False},
                                                {"text": "Conservation", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "short_answer",
                                            "prompt": "Calculate the force in Newtons required to produce an acceleration of 3 m/s^2 in a mass of 5 kg.",
                                            "points": 15,
                                            "difficulty": "intermediate",
                                            "explanation": "According to Newton's Second Law of Motion: F = m * a. Given m = 5 kg and a = 3 m/s^2, Force F = 5 * 3 = 15 N.",
                                            "accepted": ["15 N", "15N", "15", "15 newtons"]
                                        },
                                        {
                                            "type": "true_false",
                                            "prompt": "Action and reaction forces in Newton's Third Law act upon the same body and cancel each other out.",
                                            "points": 10,
                                            "difficulty": "intermediate",
                                            "explanation": "False. Action and reaction forces act on two DIFFERENT interacting bodies simultaneously; therefore, they never cancel each other out.",
                                            "options": [
                                                {"text": "False", "is_correct": True},
                                                {"text": "True", "is_correct": False},
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },

                # -------------------------------------------------------------
                # CLASS 9 CHEMISTRY
                # -------------------------------------------------------------
                {
                    "class": c9,
                    "subject_slug": "chemistry",
                    "chapters": [
                        {
                            "number": 1,
                            "title": "Fundamentals of Chemistry",
                            "slug": "fundamentals-of-chemistry",
                            "overview": "Branches of chemistry, atomic mass unit, molecular mass, mole concept, and Avogadro's number.",
                            "topics": [
                                {
                                    "title": "The Mole Concept and Avogadro's Number",
                                    "slug": "mole-concept-and-avogadro",
                                    "description": "Calculate moles, number of particles, and molar mass using N_A = 6.02 x 10^23.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "One mole of any substance contains exactly how many constituent particles?",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "By definition, one mole of a substance contains Avogadro's number of elementary entities, which is 6.022 x 10^23 particles (atoms, molecules, or ions).",
                                            "options": [
                                                {"text": "6.02 x 10^23", "is_correct": True},
                                                {"text": "3.01 x 10^23", "is_correct": False},
                                                {"text": "6.02 x 10^21", "is_correct": False},
                                                {"text": "1.66 x 10^-24", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "short_answer",
                                            "prompt": "What is the molar mass of water (H2O) in grams per mole? (Atomic masses: H=1, O=16)",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "Molar mass of H2O = (2 * 1) + (1 * 16) = 2 + 16 = 18 g/mol.",
                                            "accepted": ["18 g/mol", "18", "18g/mol", "18 g"]
                                        },
                                        {
                                            "type": "true_false",
                                            "prompt": "An empirical formula shows the simplest whole-number ratio of atoms in a compound.",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "True. The empirical formula gives the simplest whole-number ratio of atoms of each element in a compound (e.g. CH for benzene C6H6).",
                                            "options": [
                                                {"text": "True", "is_correct": True},
                                                {"text": "False", "is_correct": False},
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "number": 2,
                            "title": "Structure of Atoms",
                            "slug": "structure-of-atoms",
                            "overview": "Rutherford and Bohr atomic models, electronic configuration, subatomic particles, and isotopes.",
                            "topics": [
                                {
                                    "title": "Electronic Configuration & Energy Shells",
                                    "slug": "electronic-configuration",
                                    "description": "Distribute electrons into K, L, M, N shells and s, p, d subshells using the 2n^2 rule.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "What is the maximum number of electrons that can be accommodated in the 'M' energy shell (n = 3)?",
                                            "points": 10,
                                            "difficulty": "intermediate",
                                            "explanation": "The maximum capacity of any principal energy level is given by Bohr's formula 2n^2. For the M shell (n = 3): 2*(3)^2 = 2 * 9 = 18 electrons.",
                                            "options": [
                                                {"text": "18", "is_correct": True},
                                                {"text": "8", "is_correct": False},
                                                {"text": "32", "is_correct": False},
                                                {"text": "2", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "fill_blank",
                                            "prompt": "Atoms of the same element having identical atomic number but different mass numbers are called ________.",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "Isotopes are variants of a particular chemical element which differ in neutron number, and consequently in nucleon mass, but have the same number of protons and chemical properties.",
                                            "accepted": ["isotopes", "Isotopes"]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },

                # -------------------------------------------------------------
                # CLASS 9 MATHEMATICS
                # -------------------------------------------------------------
                {
                    "class": c9,
                    "subject_slug": "mathematics",
                    "chapters": [
                        {
                            "number": 1,
                            "title": "Matrices and Determinants",
                            "slug": "matrices-and-determinants",
                            "overview": "Order of matrix, addition and multiplication of matrices, determinant, adjoint, and Cramer's rule.",
                            "topics": [
                                {
                                    "title": "Determinant and Singular Matrices",
                                    "slug": "determinant-and-singular-matrices",
                                    "description": "Compute 2x2 determinants and identify singular vs non-singular matrices.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "A square matrix A is classified as singular if its determinant |A| is equal to:",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "A square matrix is singular if its determinant equals 0 (|A| = 0). For a singular matrix, the multiplicative inverse A^-1 does not exist.",
                                            "options": [
                                                {"text": "0", "is_correct": True},
                                                {"text": "1", "is_correct": False},
                                                {"text": "-1", "is_correct": False},
                                                {"text": "Any positive real number", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "short_answer",
                                            "prompt": "Given matrix A = [[3, 2], [1, 4]], find the value of determinant |A|.",
                                            "points": 15,
                                            "difficulty": "intermediate",
                                            "explanation": "For a 2x2 matrix [[a, b], [c, d]], |A| = (a*d) - (b*c). Here, |A| = (3 * 4) - (2 * 1) = 12 - 2 = 10.",
                                            "accepted": ["10", "det(A) = 10"]
                                        },
                                        {
                                            "type": "true_false",
                                            "prompt": "Matrix multiplication is always commutative, i.e., AB = BA for any two compatible square matrices.",
                                            "points": 10,
                                            "difficulty": "intermediate",
                                            "explanation": "False. Matrix multiplication is generally non-commutative (AB ≠ BA in the general case), even when both matrices are square of the same order.",
                                            "options": [
                                                {"text": "False", "is_correct": True},
                                                {"text": "True", "is_correct": False},
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },

                # -------------------------------------------------------------
                # CLASS 10 PHYSICS
                # -------------------------------------------------------------
                {
                    "class": c10,
                    "subject_slug": "physics",
                    "chapters": [
                        {
                            "number": 10,
                            "title": "Simple Harmonic Motion and Waves",
                            "slug": "simple-harmonic-motion-and-waves",
                            "overview": "Conditions for SHM, simple pendulum, mass-spring system, wave types, and the universal wave equation v = fλ.",
                            "topics": [
                                {
                                    "title": "Characteristics of Simple Harmonic Motion",
                                    "slug": "characteristics-of-shm",
                                    "description": "Understand restoring force, period of simple pendulum, and velocity/acceleration relationships.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "In Simple Harmonic Motion (SHM), the acceleration of an oscillating body is always directed toward:",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "In SHM, acceleration is directly proportional to displacement from the mean position and is always directed towards the equilibrium (mean) position (a ∝ -x).",
                                            "options": [
                                                {"text": "The mean (equilibrium) position", "is_correct": True},
                                                {"text": "The extreme position", "is_correct": False},
                                                {"text": "The direction of motion", "is_correct": False},
                                                {"text": "Perpendicular to displacement", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "fill_blank",
                                            "prompt": "The universal wave equation relating wave speed (v), frequency (f), and wavelength (λ) is written as v = ________.",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "The fundamental wave equation is v = f * λ (or v = fλ), meaning wave velocity equals frequency multiplied by wavelength.",
                                            "accepted": ["f*lambda", "f * lambda", "fλ", "f * λ", "f*λ", "f lambda"]
                                        },
                                        {
                                            "type": "short_answer",
                                            "prompt": "A wave has a frequency of 50 Hz and a wavelength of 4 meters. What is its speed in m/s?",
                                            "points": 15,
                                            "difficulty": "intermediate",
                                            "explanation": "Using v = f * λ: v = 50 Hz * 4 m = 200 m/s.",
                                            "accepted": ["200 m/s", "200m/s", "200"]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "number": 14,
                            "title": "Current Electricity",
                            "slug": "current-electricity",
                            "overview": "Ohm's Law, series and parallel circuits, electrical energy, Joule's law, and household safety.",
                            "topics": [
                                {
                                    "title": "Ohm's Law and Circuit Resistances",
                                    "slug": "ohms-law-and-circuits",
                                    "description": "Analyze V = IR, equivalent resistance in series and parallel, and electrical power.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "According to Ohm's Law, the current passing through a conductor is directly proportional to the potential difference across its ends, provided that:",
                                            "points": 10,
                                            "difficulty": "intermediate",
                                            "explanation": "Ohm's Law states that I ∝ V provided the physical state and temperature of the conductor remain constant.",
                                            "options": [
                                                {"text": "The temperature remains constant", "is_correct": True},
                                                {"text": "The resistance increases with voltage", "is_correct": False},
                                                {"text": "The circuit is in alternating current mode", "is_correct": False},
                                                {"text": "The wire length is doubled", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "short_answer",
                                            "prompt": "Two resistors of 6 ohms and 12 ohms are connected in parallel. What is their equivalent resistance in ohms?",
                                            "points": 15,
                                            "difficulty": "advanced",
                                            "explanation": "For two resistors in parallel: 1/R_eq = 1/R1 + 1/R2 = 1/6 + 1/12 = 2/12 + 1/12 = 3/12 = 1/4. Therefore, R_eq = 4 ohms.",
                                            "accepted": ["4 ohms", "4", "4 ohm", "4Ω"]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },

                # -------------------------------------------------------------
                # CLASS 10 CHEMISTRY
                # -------------------------------------------------------------
                {
                    "class": c10,
                    "subject_slug": "chemistry",
                    "chapters": [
                        {
                            "number": 9,
                            "title": "Chemical Equilibrium",
                            "slug": "chemical-equilibrium",
                            "overview": "Reversible reactions, dynamic equilibrium, Law of Mass Action, and equilibrium constant Kc.",
                            "topics": [
                                {
                                    "title": "Law of Mass Action and Equilibrium Constant (Kc)",
                                    "slug": "law-of-mass-action-and-kc",
                                    "description": "Express equilibrium constant expressions and determine reaction quotient Q.",
                                    "difficulty": "intermediate",
                                    "order": 1,
                                    "questions": [
                                        {
                                            "type": "mcq",
                                            "prompt": "At dynamic chemical equilibrium, which of the following conditions is satisfied?",
                                            "points": 10,
                                            "difficulty": "beginner",
                                            "explanation": "Dynamic chemical equilibrium is achieved when the rate of the forward reaction equals the rate of the reverse reaction, while reactant and product concentrations remain constant over time.",
                                            "options": [
                                                {"text": "Rate of forward reaction equals rate of reverse reaction", "is_correct": True},
                                                {"text": "Concentrations of reactants and products become zero", "is_correct": False},
                                                {"text": "The reaction ceases entirely", "is_correct": False},
                                                {"text": "Only products remain in the vessel", "is_correct": False},
                                            ]
                                        },
                                        {
                                            "type": "true_false",
                                            "prompt": "A catalyst increases the value of the equilibrium constant Kc.",
                                            "points": 10,
                                            "difficulty": "intermediate",
                                            "explanation": "False. A catalyst speeds up both forward and backward reactions equally by lowering activation energy; it helps achieve equilibrium faster but DOES NOT change the equilibrium constant Kc.",
                                            "options": [
                                                {"text": "False", "is_correct": True},
                                                {"text": "True", "is_correct": False},
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]

            total_chapters = 0
            total_topics = 0
            total_questions = 0

            for entry in seed_data:
                class_obj = entry["class"]
                cs = get_cs(class_obj, entry["subject_slug"])
                if not cs:
                    self.stdout.write(self.style.WARNING(f"ClassSubject {class_obj.name} - {entry['subject_slug']} not found. Skipping."))
                    continue

                for ch_data in entry["chapters"]:
                    chapter, _ = Chapter.objects.update_or_create(
                        class_subject=cs,
                        chapter_number=ch_data["number"],
                        defaults={
                            "title": ch_data["title"],
                            "slug": ch_data["slug"],
                            "overview": ch_data["overview"],
                        }
                    )
                    total_chapters += 1

                    for t_data in ch_data["topics"]:
                        topic, _ = PracticeTopic.objects.update_or_create(
                            chapter=chapter,
                            slug=t_data["slug"],
                            defaults={
                                "title": t_data["title"],
                                "description": t_data["description"],
                                "difficulty": t_data["difficulty"],
                                "order": t_data["order"],
                                "is_published": True,
                            }
                        )
                        total_topics += 1

                        for q_data in t_data["questions"]:
                            q_type = q_data["type"]
                            prompt = q_data["prompt"]
                            explanation = q_data["explanation"]
                            points = q_data.get("points", 10)
                            diff = q_data.get("difficulty", "intermediate")

                            q_obj, created = Question.objects.update_or_create(
                                topic=topic,
                                prompt=prompt,
                                defaults={
                                    "question_type": q_type,
                                    "explanation": explanation,
                                    "points": points,
                                    "difficulty": diff,
                                    "order": Question.objects.filter(topic=topic).count() + 1 if not Question.objects.filter(topic=topic, prompt=prompt).exists() else 1,
                                    "is_published": True,
                                }
                            )
                            total_questions += 1

                            if q_type in ('mcq', 'true_false') and "options" in q_data:
                                q_obj.options.all().delete()
                                for idx, opt in enumerate(q_data["options"], 1):
                                    QuestionOption.objects.create(
                                        question=q_obj,
                                        option_text=opt["text"],
                                        is_correct=opt["is_correct"],
                                        order=idx
                                    )

                            elif q_type in ('fill_blank', 'short_answer') and "accepted" in q_data:
                                q_obj.accepted_answers.all().delete()
                                for acc in q_data["accepted"]:
                                    QuestionAcceptedAnswer.objects.create(
                                        question=q_obj,
                                        accepted_text=acc,
                                        is_case_sensitive=False
                                    )

            self.stdout.write(self.style.SUCCESS(
                f"Successfully seeded: {total_chapters} chapters, {total_topics} topics, and {total_questions} questions across FBISE subjects!"
            ))

