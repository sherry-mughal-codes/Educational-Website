from io import BytesIO
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import ClassLevel, Subject, ClassSubject, Chapter, Resource
from .pdf_utils import validate_pdf_file

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
