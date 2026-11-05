import json
from decimal import Decimal
from io import BytesIO
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import (
    ClassLevel, Subject, ClassSubject, Chapter, Resource,
    StudentProfile, Order, Purchase
)
from .pdf_utils import validate_pdf_file
from .payments.jazzcash import JazzCashGateway
from .payments.easypaisa import EasypaisaGateway
from .payments.sandbox import SandboxPaymentGateway

class EducationalApiTests(TestCase):
    def setUp(self):
        self.client = Client()

        self.class_9 = ClassLevel.objects.create(
            name="Class 9 (SSC Part I)",
            grade_number=9,
            slug="class-9",
            description="Class 9 curriculum",
            is_active=True
        )

        self.physics = Subject.objects.create(
            name="Physics",
            slug="physics",
            code="PHY",
            description="Physics curriculum"
        )

        self.class_subject = ClassSubject.objects.create(
            class_level=self.class_9,
            subject=self.physics,
            syllabus_overview="FBISE Physics overview",
            total_chapters=9,
            is_active=True
        )

        self.resource = Resource.objects.create(
            class_subject=self.class_subject,
            title="Class 9 Physics Complete Notes",
            slug="physics-complete-notes",
            resource_type="complete_notes",
            description="Full Physics notes",
            content_preview="Chapter 1: Kinematics",
            file_format="PDF",
            page_count=192,
            is_published=True
        )

    def test_health_check(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['database'], 'connected')

    def test_class_list(self):
        response = self.client.get('/api/classes/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data['classes']) >= 1)
        self.assertEqual(data['classes'][0]['slug'], 'class-9')

    def test_class_detail(self):
        response = self.client.get('/api/classes/class-9/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['slug'], 'class-9')
        self.assertEqual(len(data['subjects']), 1)
        self.assertEqual(data['subjects'][0]['slug'], 'physics')

    def test_subject_detail(self):
        response = self.client.get('/api/classes/class-9/physics/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['subject']['slug'], 'physics')
        self.assertEqual(len(data['resources']), 1)
        self.assertEqual(data['resources'][0]['slug'], 'physics-complete-notes')

    def test_resource_detail(self):
        response = self.client.get('/api/resources/class-9/physics/physics-complete-notes/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['title'], 'Class 9 Physics Complete Notes')
        self.assertEqual(data['file_format'], 'PDF')

    def test_search_resources(self):
        response = self.client.get('/api/resources/?q=physics&class=class-9')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['total_results'], 1)
        self.assertEqual(data['results'][0]['slug'], 'physics-complete-notes')

    def test_search_empty_results(self):
        response = self.client.get('/api/resources/?q=nonexistentqueryxyz')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['total_results'], 0)
        self.assertEqual(len(data['results']), 0)

    def test_sitemap_data(self):
        response = self.client.get('/api/sitemap-data/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data['urls']) > 5)

    def test_missing_class_returns_404(self):
        response = self.client.get('/api/classes/nonexistent-class/')
        self.assertEqual(response.status_code, 404)

    def test_missing_resource_returns_404(self):
        response = self.client.get('/api/resources/class-9/physics/nonexistent-resource/')
        self.assertEqual(response.status_code, 404)


class AdminPhase3Tests(TestCase):
    """
    Phase 3: Admin Content Management and PDF Publishing test suite.
    Enforces authentication, permissions, safe PDF uploads, structure, and publishing workflows.
    """
    def setUp(self):
        self.client = Client()

        # Seed staff administrator
        self.admin_user = User.objects.create_user(
            username='staffadmin',
            email='admin@fbise-notes.local',
            password='TestStaffPassword2026!',
            is_staff=True,
            is_superuser=False
        )

        # Seed non-admin user
        self.regular_user = User.objects.create_user(
            username='student1',
            email='student@example.com',
            password='StudentPassword2026!',
            is_staff=False
        )

        # Setup taxonomy
        self.class_10 = ClassLevel.objects.create(
            name="Class 10 (SSC Part II)",
            grade_number=10,
            slug="class-10",
            description="Class 10 FBISE curriculum",
            is_active=True
        )

        self.chemistry = Subject.objects.create(
            name="Chemistry",
            slug="chemistry",
            code="CHEM",
            description="FBISE Chemistry"
        )

        self.class_subject = ClassSubject.objects.create(
            class_level=self.class_10,
            subject=self.chemistry,
            syllabus_overview="Class 10 Chemistry syllabus",
            total_chapters=8,
            is_active=True
        )

        self.resource = Resource.objects.create(
            class_subject=self.class_subject,
            title="Class 10 Chemistry Notes",
            slug="chemistry-notes",
            resource_type="complete_notes",
            description="Complete Class 10 Chemistry notes",
            page_count=180,
            is_published=True
        )

    # 1. Authentication & Permission Enforcement
    def test_unauthenticated_access_to_admin_resources_rejected(self):
        response = self.client.get('/api/admin/resources/')
        self.assertEqual(response.status_code, 401)

    def test_non_staff_user_access_rejected(self):
        self.client.login(username='student1', password='StudentPassword2026!')
        response = self.client.get('/api/admin/resources/')
        self.assertEqual(response.status_code, 403)

    def test_admin_login_success_and_session(self):
        response = self.client.post('/api/admin/auth/login/', {
            'username': 'staffadmin',
            'password': 'TestStaffPassword2026!'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['username'], 'staffadmin')
        self.assertTrue(data['user']['is_staff'])

        # Check me endpoint
        me_resp = self.client.get('/api/admin/auth/me/')
        self.assertEqual(me_resp.status_code, 200)
        me_data = me_resp.json()
        self.assertTrue(me_data['authenticated'])
        self.assertEqual(me_data['user']['username'], 'staffadmin')

        # Logout
        logout_resp = self.client.post('/api/admin/auth/logout/')
        self.assertEqual(logout_resp.status_code, 200)

        # Check me after logout
        me_after = self.client.get('/api/admin/auth/me/')
        self.assertFalse(me_after.json()['authenticated'])

    # 2. Resource Management Operations
    def test_admin_create_resource(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')
        response = self.client.post('/api/admin/resources/', {
            'class_level_id': self.class_10.id,
            'subject_id': self.chemistry.id,
            'title': 'Chemical Equilibrium Guide',
            'slug': 'chemical-equilibrium-guide',
            'resource_type': 'chapter_guide',
            'description': 'Solved short questions and numericals.',
            'page_count': 32,
            'is_published': 'true',
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['slug'], 'chemical-equilibrium-guide')

        # Verify in database
        res = Resource.objects.filter(slug='chemical-equilibrium-guide').first()
        self.assertIsNotNone(res)
        self.assertEqual(res.title, 'Chemical Equilibrium Guide')
        self.assertTrue(res.is_published)

    def test_admin_create_resource_slug_collision_prevented(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')
        response = self.client.post('/api/admin/resources/', {
            'class_level_id': self.class_10.id,
            'subject_id': self.chemistry.id,
            'title': 'Another Chemistry Notes',
            'slug': 'chemistry-notes', # already exists in setUp
            'description': 'Duplicate slug test.',
        })
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('already exists', data['error'])

    def test_admin_edit_resource_metadata(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')
        response = self.client.post(
            f'/api/admin/resources/{self.resource.id}/',
            {
                'title': 'Class 10 Chemistry Updated Notes 2026',
                'slug': 'chemistry-notes-2026',
                'description': 'Updated description.',
                'is_published': True,
                'page_count': 195,
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.resource.refresh_from_db()
        self.assertEqual(self.resource.title, 'Class 10 Chemistry Updated Notes 2026')
        self.assertEqual(self.resource.slug, 'chemistry-notes-2026')
        self.assertEqual(self.resource.page_count, 195)

    def test_admin_toggle_publish(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')
        self.assertTrue(self.resource.is_published)

        # Toggle to draft
        res1 = self.client.post(f'/api/admin/resources/{self.resource.id}/toggle-publish/')
        self.assertEqual(res1.status_code, 200)
        self.assertFalse(res1.json()['is_published'])
        self.resource.refresh_from_db()
        self.assertFalse(self.resource.is_published)

        # Public subject detail should NOT show the draft resource
        pub_resp = self.client.get('/api/classes/class-10/chemistry/')
        self.assertEqual(len(pub_resp.json()['resources']), 0)

        # Public resource detail returns 404 for draft
        pub_res_resp = self.client.get(f'/api/resources/class-10/chemistry/{self.resource.slug}/')
        self.assertEqual(pub_res_resp.status_code, 404)

        # Toggle back to published
        res2 = self.client.post(f'/api/admin/resources/{self.resource.id}/toggle-publish/')
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json()['is_published'])
        self.resource.refresh_from_db()
        self.assertTrue(self.resource.is_published)

        # Now visible again on public website
        pub_resp2 = self.client.get('/api/classes/class-10/chemistry/')
        self.assertEqual(len(pub_resp2.json()['resources']), 1)

    # 3. PDF Upload, Magic Bytes Validation & Safe Replacement
    def test_upload_valid_pdf_file(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')
        # Valid PDF header: %PDF-1.4 ... %%EOF
        pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
        upload_file = SimpleUploadedFile(
            name="test_doc.pdf",
            content=pdf_content,
            content_type="application/pdf"
        )

        response = self.client.post(
            f'/api/admin/resources/{self.resource.id}/upload-pdf/',
            {'pdf_file': upload_file}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertTrue(data['has_pdf'])

        self.resource.refresh_from_db()
        self.assertTrue(bool(self.resource.pdf_file))
        self.assertEqual(self.resource.file_size_bytes, len(pdf_content))

    def test_upload_invalid_file_rejected_and_preserves_existing(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')

        # First, upload a valid PDF
        valid_pdf = SimpleUploadedFile(
            name="valid_initial.pdf",
            content=b"%PDF-1.4\nvalid initial content\n%%EOF",
            content_type="application/pdf"
        )
        self.client.post(
            f'/api/admin/resources/{self.resource.id}/upload-pdf/',
            {'pdf_file': valid_pdf}
        )
        self.resource.refresh_from_db()
        initial_file_name = self.resource.pdf_file.name

        # Now attempt to upload an invalid file (not a PDF, even though named .pdf)
        fake_pdf = SimpleUploadedFile(
            name="malicious_script.pdf",
            content=b"<!DOCTYPE html><html><body>Fake document with HTML payload instead of PDF header</body></html>",
            content_type="application/pdf"
        )
        fail_response = self.client.post(
            f'/api/admin/resources/{self.resource.id}/upload-pdf/',
            {'pdf_file': fake_pdf}
        )
        self.assertEqual(fail_response.status_code, 400)
        self.assertIn("magic header", fail_response.json()['error'])

        # Verify existing valid file was completely preserved!
        self.resource.refresh_from_db()
        self.assertEqual(self.resource.pdf_file.name, initial_file_name)

    def test_pdf_streaming_endpoint(self):
        # Attach valid PDF
        self.resource.pdf_file.save("test_chem.pdf", SimpleUploadedFile("test_chem.pdf", b"%PDF-1.4\nsample data\n%%EOF"))
        self.resource.is_published = True
        self.resource.save()

        # Stream published PDF (students can view online)
        stream_url = f"/api/resources/class-10/chemistry/{self.resource.slug}/pdf-stream/"
        response = self.client.get(stream_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('inline', response['Content-Disposition'])

        # Unpublished resource streaming should return 404
        self.resource.is_published = False
        self.resource.save()
        unpub_response = self.client.get(stream_url)
        self.assertEqual(unpub_response.status_code, 404)

    # 4. Educational Structure Management
    def test_admin_create_subject_and_chapter(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')

        # 1. Create a new subject
        subj_resp = self.client.post('/api/admin/structure/subjects/', {
            'name': 'Biology',
            'slug': 'biology',
            'code': 'BIO',
            'icon_name': 'dna',
            'description': 'FBISE Biology curriculum.'
        }, content_type='application/json')
        self.assertEqual(subj_resp.status_code, 201)
        self.assertTrue(subj_resp.json()['success'])
        bio_id = subj_resp.json()['id']
        self.assertTrue(Subject.objects.filter(id=bio_id).exists())

        # 2. Link to class and create chapter
        cs = ClassSubject.objects.create(
            class_level=self.class_10,
            subject_id=bio_id,
            syllabus_overview="Class 10 Biology overview",
            total_chapters=9
        )

        chap_resp = self.client.post('/api/admin/structure/chapters/', {
            'class_subject_id': cs.id,
            'chapter_number': 10,
            'title': 'Gaseous Exchange',
            'slug': 'gaseous-exchange',
            'overview': 'Breathing and respiration mechanisms.'
        }, content_type='application/json')
        self.assertEqual(chap_resp.status_code, 201)
        self.assertTrue(chap_resp.json()['success'])
        self.assertTrue(Chapter.objects.filter(class_subject=cs, chapter_number=10).exists())

    # 5. Safe Resource Deletion
    def test_admin_delete_resource(self):
        self.client.login(username='staffadmin', password='TestStaffPassword2026!')
        res_id = self.resource.id
        del_resp = self.client.delete(f'/api/admin/resources/{res_id}/')
        self.assertEqual(del_resp.status_code, 200)
        self.assertTrue(del_resp.json()['success'])

        # Verify removed from database
        self.assertFalse(Resource.objects.filter(id=res_id).exists())


# ==============================================================================
# PHASE 4: STUDENT ACCOUNTS, PAYMENTS & SECURE PAID DOWNLOAD TESTS
# ==============================================================================

class StudentAuthenticationAndRoleIsolationTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff_user = User.objects.create_user(
            username='staff_test',
            email='staff@fbise.edu.pk',
            password='StaffPassword2026!',
            is_staff=True
        )

    def test_student_registration_success(self):
        resp = self.client.post('/api/student/register/', {
            'full_name': 'Ali Khan',
            'email': 'ali.khan@example.com',
            'password': 'SecureStudent2026!',
            'password_confirm': 'SecureStudent2026!'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['email'], 'ali.khan@example.com')
        self.assertFalse(data['user']['is_staff'])

        # Verify DB records
        user = User.objects.get(email='ali.khan@example.com')
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(StudentProfile.objects.filter(user=user).exists())

    def test_student_registration_duplicate_email_rejected(self):
        self.client.post('/api/student/register/', {
            'full_name': 'Student One',
            'email': 'student@example.com',
            'password': 'Password2026!',
            'password_confirm': 'Password2026!'
        }, content_type='application/json')

        resp2 = self.client.post('/api/student/register/', {
            'full_name': 'Student Two',
            'email': 'student@example.com',
            'password': 'Password2026!',
            'password_confirm': 'Password2026!'
        }, content_type='application/json')
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('already registered', resp2.json()['error'])

    def test_student_registration_weak_password_rejected(self):
        resp = self.client.post('/api/student/register/', {
            'full_name': 'Student',
            'email': 'student@example.com',
            'password': 'short',
            'password_confirm': 'short'
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('8 characters', resp.json()['error'])

    def test_student_login_and_session(self):
        self.client.post('/api/student/register/', {
            'full_name': 'Sara Ahmed',
            'email': 'sara@example.com',
            'password': 'SaraPassword2026!',
            'password_confirm': 'SaraPassword2026!'
        }, content_type='application/json')

        login_resp = self.client.post('/api/student/login/', {
            'email': 'sara@example.com',
            'password': 'SaraPassword2026!'
        }, content_type='application/json')
        self.assertEqual(login_resp.status_code, 200)
        self.assertTrue(login_resp.json()['success'])

        # Test student/me
        me_resp = self.client.get('/api/student/me/')
        self.assertEqual(me_resp.status_code, 200)
        self.assertTrue(me_resp.json()['authenticated'])
        self.assertEqual(me_resp.json()['user']['email'], 'sara@example.com')

    def test_student_cannot_access_admin_endpoints(self):
        # Register and log in student
        self.client.post('/api/student/register/', {
            'full_name': 'Normal Student',
            'email': 'normal@example.com',
            'password': 'StudentPass2026!',
            'password_confirm': 'StudentPass2026!'
        }, content_type='application/json')

        # Attempt to access admin resources list
        admin_resp = self.client.get('/api/admin/resources/')
        self.assertEqual(admin_resp.status_code, 403)

        # Attempt to access admin orders
        order_resp = self.client.get('/api/admin/orders/')
        self.assertEqual(order_resp.status_code, 403)

    def test_student_logout(self):
        self.client.post('/api/student/register/', {
            'full_name': 'Logout Test',
            'email': 'logout@example.com',
            'password': 'LogoutPass2026!',
            'password_confirm': 'LogoutPass2026!'
        }, content_type='application/json')

        logout_resp = self.client.post('/api/student/logout/')
        self.assertEqual(logout_resp.status_code, 200)

        me_resp = self.client.get('/api/student/me/')
        self.assertFalse(me_resp.json()['authenticated'])


class OrderAndPricingSecurityTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.class_10 = ClassLevel.objects.create(name="Class 10", grade_number=10, slug="class-10")
        self.math = Subject.objects.create(name="Mathematics", slug="mathematics", code="MATH")
        self.cs = ClassSubject.objects.create(class_level=self.class_10, subject=self.math)
        self.resource = Resource.objects.create(
            class_subject=self.cs,
            title="Class 10 Mathematics Complete Guide",
            slug="class-10-math-complete",
            price=Decimal('100.00'),
            is_published=True
        )

        # Create and login student
        self.student_user = User.objects.create_user(
            username='order_student@example.com',
            email='order_student@example.com',
            password='StudentPass2026!'
        )
        StudentProfile.objects.create(user=self.student_user)
        self.client.force_login(self.student_user)

    def test_order_creation_locks_price_from_database(self):
        # Client attempts to pass fraudulent amount
        resp = self.client.post('/api/orders/create/', {
            'resource_id': self.resource.id,
            'payment_gateway': 'sandbox',
            'amount': '1.00'  # Tampered client amount
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data['success'])

        order = Order.objects.get(order_reference=data['order_reference'])
        # The amount must be the authoritative database price (PKR 100.00), not the 1.00 client payload
        self.assertEqual(order.amount, Decimal('100.00'))
        self.assertEqual(order.currency, 'PKR')
        self.assertEqual(order.status, 'pending')

    def test_payment_gateways_list_endpoint(self):
        resp = self.client.get('/api/payments/gateways/')
        self.assertEqual(resp.status_code, 200)
        gateways = resp.json()['gateways']
        gateway_ids = [g['id'] for g in gateways]
        self.assertIn('jazzcash', gateway_ids)
        self.assertIn('easypaisa', gateway_ids)
        self.assertIn('sandbox', gateway_ids)


class SandboxPaymentAndPurchaseGrantTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.class_10 = ClassLevel.objects.create(name="Class 10", grade_number=10, slug="class-10")
        self.chem = Subject.objects.create(name="Chemistry", slug="chemistry", code="CHEM")
        self.cs = ClassSubject.objects.create(class_level=self.class_10, subject=self.chem)
        self.resource = Resource.objects.create(
            class_subject=self.cs,
            title="Class 10 Chemistry Solved Notes",
            slug="class-10-chem-notes",
            price=Decimal('100.00'),
            is_published=True
        )

        self.student = User.objects.create_user(
            username='chem_student@example.com',
            email='chem_student@example.com',
            password='StudentPass2026!'
        )
        StudentProfile.objects.create(user=self.student)
        self.client.force_login(self.student)

    def test_sandbox_simulate_payment_grants_purchase(self):
        # 1. Create order
        create_resp = self.client.post('/api/orders/create/', {
            'resource_id': self.resource.id,
            'payment_gateway': 'sandbox'
        }, content_type='application/json')
        order_ref = create_resp.json()['order_reference']

        # 2. Simulate sandbox payment
        pay_resp = self.client.post('/api/payments/sandbox-pay/', {
            'order_reference': order_ref
        }, content_type='application/json')
        self.assertEqual(pay_resp.status_code, 200)
        self.assertTrue(pay_resp.json()['success'])

        # 3. Check order updated to paid
        order = Order.objects.get(order_reference=order_ref)
        self.assertEqual(order.status, 'paid')
        self.assertIsNotNone(order.paid_at)

        # 4. Check purchase record created
        purchase = Purchase.objects.get(order=order)
        self.assertEqual(purchase.student, self.student)
        self.assertEqual(purchase.resource, self.resource)
        self.assertTrue(purchase.is_active)

    def test_payment_callback_idempotency(self):
        # Create order
        order = Order.objects.create(
            order_reference='TEST-IDEM-001',
            student=self.student,
            resource=self.resource,
            amount=Decimal('100.00'),
            payment_gateway='sandbox',
            status='pending'
        )

        # Call sandbox payment twice
        self.client.post('/api/payments/sandbox-pay/', {
            'order_reference': 'TEST-IDEM-001'
        }, content_type='application/json')

        self.client.post('/api/payments/sandbox-pay/', {
            'order_reference': 'TEST-IDEM-001'
        }, content_type='application/json')

        # Must have exactly 1 purchase record, not 2
        self.assertEqual(Purchase.objects.filter(order=order).count(), 1)


class SecurePaidPdfDownloadTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.class_9 = ClassLevel.objects.create(name="Class 9", grade_number=9, slug="class-9")
        self.phy = Subject.objects.create(name="Physics", slug="physics", code="PHY")
        self.cs = ClassSubject.objects.create(class_level=self.class_9, subject=self.phy)
        self.resource = Resource.objects.create(
            class_subject=self.cs,
            title="Class 9 Physics Complete Notes",
            slug="physics-complete-notes",
            price=Decimal('100.00'),
            is_published=True
        )
        self.resource.pdf_file.save("phy9.pdf", SimpleUploadedFile("phy9.pdf", b"%PDF-1.4\nprotected pdf data\n%%EOF"))

        self.download_url = f"/api/resources/class-9/physics/{self.resource.slug}/download/"
        self.stream_url = f"/api/resources/class-9/physics/{self.resource.slug}/pdf-stream/"

        self.student = User.objects.create_user(
            username='dl_student@example.com',
            email='dl_student@example.com',
            password='Pass2026!'
        )
        StudentProfile.objects.create(user=self.student)

        self.staff = User.objects.create_user(
            username='staff_dl@example.com',
            email='staff_dl@example.com',
            password='Pass2026!',
            is_staff=True
        )

    def test_secure_download_unauthenticated_returns_401(self):
        resp = self.client.get(self.download_url)
        self.assertEqual(resp.status_code, 401)
        self.assertIn('Authentication required', resp.json()['error'])

    def test_secure_download_unpurchased_returns_403(self):
        self.client.force_login(self.student)
        resp = self.client.get(self.download_url)
        self.assertEqual(resp.status_code, 403)
        self.assertIn('purchase required', resp.json()['error'].lower())

    def test_secure_download_purchased_returns_200_pdf(self):
        self.client.force_login(self.student)
        # Grant purchase
        order = Order.objects.create(
            order_reference='ORD-PAID-001',
            student=self.student,
            resource=self.resource,
            amount=Decimal('100.00'),
            status='paid'
        )
        Purchase.objects.create(student=self.student, resource=self.resource, order=order, is_active=True)

        resp = self.client.get(self.download_url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertIn('attachment', resp['Content-Disposition'])

    def test_secure_download_free_resource_returns_200_for_authenticated_student(self):
        self.resource.is_free = True
        self.resource.save()

        self.client.force_login(self.student)
        resp = self.client.get(self.download_url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')

    def test_secure_download_staff_override(self):
        self.client.force_login(self.staff)
        resp = self.client.get(self.download_url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')

    def test_public_stream_remains_available_unauthenticated(self):
        # Online reading in browser does not require authentication or purchase
        resp = self.client.get(self.stream_url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertIn('inline', resp['Content-Disposition'])


class AdminOrdersAndRefundManagementTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.staff = User.objects.create_user(
            username='admin_sales@fbise.edu.pk',
            email='admin_sales@fbise.edu.pk',
            password='AdminPass2026!',
            is_staff=True
        )
        self.student = User.objects.create_user(
            username='student_refund@example.com',
            email='student_refund@example.com',
            password='Pass2026!'
        )
        StudentProfile.objects.create(user=self.student)

        self.class_10 = ClassLevel.objects.create(name="Class 10", grade_number=10, slug="class-10")
        self.eng = Subject.objects.create(name="English", slug="english", code="ENG")
        self.cs = ClassSubject.objects.create(class_level=self.class_10, subject=self.eng)
        self.resource = Resource.objects.create(
            class_subject=self.cs,
            title="Class 10 English Notes",
            slug="class-10-english-notes",
            price=Decimal('100.00'),
            is_published=True
        )
        self.resource.pdf_file.save("eng10.pdf", SimpleUploadedFile("eng10.pdf", b"%PDF-1.4\nenglish\n%%EOF"))

        self.order = Order.objects.create(
            order_reference='ORD-REFUND-001',
            student=self.student,
            resource=self.resource,
            amount=Decimal('100.00'),
            payment_gateway='easypaisa',
            status='paid'
        )
        self.purchase = Purchase.objects.create(
            student=self.student,
            resource=self.resource,
            order=self.order,
            is_active=True
        )

    def test_admin_orders_list_and_filter(self):
        self.client.force_login(self.staff)
        resp = self.client.get('/api/admin/orders/?status=paid')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['total'] >= 1)
        self.assertEqual(data['orders'][0]['order_reference'], 'ORD-REFUND-001')

    def test_admin_refund_and_revocation(self):
        self.client.force_login(self.staff)
        refund_resp = self.client.post(f'/api/admin/orders/{self.order.id}/refund/', {
            'reason': 'Accidental duplicate purchase'
        }, content_type='application/json')
        self.assertEqual(refund_resp.status_code, 200)
        self.assertTrue(refund_resp.json()['success'])

        # Verify DB order is refunded
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'refunded')

        # Verify DB purchase is revoked
        self.purchase.refresh_from_db()
        self.assertFalse(self.purchase.is_active)
        self.assertIsNotNone(self.purchase.revoked_at)

        # Student subsequent download attempt now returns 403 Forbidden
        self.client.force_login(self.student)
        dl_resp = self.client.get(f"/api/resources/class-10/english/{self.resource.slug}/download/")
        self.assertEqual(dl_resp.status_code, 403)

