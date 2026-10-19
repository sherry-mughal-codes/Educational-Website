from django.test import TestCase, Client
from django.urls import reverse
from .models import ClassLevel, Subject, ClassSubject, Resource

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
