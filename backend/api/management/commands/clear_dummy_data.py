import os
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from api.models import (
    Resource, Order, Purchase,
    PracticeTopic, Question, QuestionOption, QuestionAcceptedAnswer,
    PracticeSession, PracticeAttempt
)

class Command(BaseCommand):
    help = "Cleans all dummy resources, test orders, purchases, and practice questions so admin can add authentic data manually."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("==> Cleaning all dummy resources, orders, and test data..."))

        with transaction.atomic():
            # 1. Delete Orders & Purchases
            p_count = Purchase.objects.count()
            o_count = Order.objects.count()
            Purchase.objects.all().delete()
            Order.objects.all().delete()
            self.stdout.write(f"Removed {p_count} purchases and {o_count} orders.")

            # 2. Delete Practice Questions, Options, Attempts & Topics
            pa_count = PracticeAttempt.objects.count()
            ps_count = PracticeSession.objects.count()
            qaa_count = QuestionAcceptedAnswer.objects.count()
            qo_count = QuestionOption.objects.count()
            q_count = Question.objects.count()
            pt_count = PracticeTopic.objects.count()

            PracticeAttempt.objects.all().delete()
            PracticeSession.objects.all().delete()
            QuestionAcceptedAnswer.objects.all().delete()
            QuestionOption.objects.all().delete()
            Question.objects.all().delete()
            PracticeTopic.objects.all().delete()
            self.stdout.write(f"Removed {pt_count} topics and {q_count} questions.")

            # 3. Delete Dummy Resources
            r_count = Resource.objects.count()
            Resource.objects.all().delete()
            self.stdout.write(f"Removed {r_count} resources.")

        # 4. Clean up media/pdfs folder
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'pdfs')
        if os.path.exists(pdf_dir):
            for item in os.listdir(pdf_dir):
                item_path = os.path.join(pdf_dir, item)
                try:
                    if os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                    else:
                        os.remove(item_path)
                except Exception as exc:
                    self.stdout.write(self.style.WARNING(f"Could not remove {item_path}: {exc}"))
            self.stdout.write("Cleaned media/pdfs/ storage directory.")

        self.stdout.write(self.style.SUCCESS("✓ Successfully cleared all dummy data! The platform is now completely clean for manual entry."))
