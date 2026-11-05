/**
 * Data fetching library for FBISE Educational Platform.
 * Single source of truth connecting Next.js App Router to Django REST API.
 */

const API_BASE = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL || 'http://backend:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export interface SubjectItem {
  id: number;
  name: string;
  slug: string;
  code: string;
  icon_name: string;
  description: string;
  total_chapters: number;
  resources_count?: number;
  published_resources_count?: number;
  syllabus_overview?: string;
  url?: string;
}

export interface ClassItem {
  id: number;
  name: string;
  grade_number: number;
  slug: string;
  description: string;
  subjects_count: number;
  subjects: SubjectItem[];
}

export interface ChapterItem {
  id: number;
  number: number;
  title: string;
  slug: string;
  overview?: string;
}

export interface ResourceItem {
  id: number;
  title: string;
  slug: string;
  resource_type: string;
  resource_type_display: string;
  description: string;
  content_preview?: string;
  file_format: string;
  page_count: number;
  has_pdf?: boolean;
  pdf_stream_url?: string | null;
  download_url?: string | null;
  file_size_bytes?: number;
  price?: string | number;
  currency?: string;
  is_free?: boolean;
  user_has_purchased?: boolean;
  is_published?: boolean;
  author_attribution?: string;
  meta_title?: string;
  meta_description?: string;
  url?: string;
  public_url?: string;
  class_name?: string;
  class_slug?: string;
  class_level_id?: number;
  subject_name?: string;
  subject_slug?: string;
  subject_id?: number;
  chapter_id?: number | null;
  chapter_title?: string | null;
  chapter?: {
    id: number;
    number: number;
    title: string;
  } | null;
  updated_at?: string;
  created_at?: string;
  class?: {
    name: string;
    grade_number: number;
    slug: string;
  };
  subject?: {
    name: string;
    slug: string;
    code: string;
    icon_name: string;
    total_chapters?: number;
    syllabus_overview?: string;
  };
  related_resources?: Array<{
    title: string;
    slug: string;
    resource_type_display: string;
    url: string;
    file_format: string;
    page_count: number;
    has_pdf?: boolean;
  }>;
}

export interface SearchResult {
  query: string;
  filters: {
    class: string;
    subject: string;
    type: string;
  };
  total_results: number;
  results: ResourceItem[];
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      credentials: 'include', // Support session cookies
      ...options,
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`API error ${res.status} on ${url}: ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Fetch exception on ${url}:`, err);
    return null;
  }
}

// ==============================================================================
// Public API
// ==============================================================================
export async function getClasses(): Promise<ClassItem[]> {
  const data = await fetchApi<{ classes: ClassItem[] }>('/api/classes/', {
    next: { revalidate: 60 },
  });
  return data?.classes || [];
}

export async function getClass(classSlug: string): Promise<ClassItem | null> {
  return await fetchApi<ClassItem>(`/api/classes/${classSlug}/`, {
    next: { revalidate: 60 },
  });
}

export async function getSubject(classSlug: string, subjectSlug: string) {
  return await fetchApi<{
    class: { name: string; grade_number: number; slug: string };
    subject: SubjectItem;
    resources_count: number;
    resources: ResourceItem[];
  }>(`/api/classes/${classSlug}/${subjectSlug}/`, {
    next: { revalidate: 60 },
  });
}

export async function getResource(classSlug: string, subjectSlug: string, resourceSlug: string): Promise<ResourceItem | null> {
  return await fetchApi<ResourceItem>(`/api/resources/${classSlug}/${subjectSlug}/${resourceSlug}/`, {
    next: { revalidate: 30 },
  });
}

export async function searchResources(params: {
  q?: string;
  class?: string;
  subject?: string;
  type?: string;
}): Promise<SearchResult> {
  const queryParts: string[] = [];
  if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
  if (params.class) queryParts.push(`class=${encodeURIComponent(params.class)}`);
  if (params.subject) queryParts.push(`subject=${encodeURIComponent(params.subject)}`);
  if (params.type) queryParts.push(`type=${encodeURIComponent(params.type)}`);

  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const data = await fetchApi<SearchResult>(`/api/resources/${qs}`, {
    cache: 'no-store',
  });
  return data || {
    query: params.q || '',
    filters: { class: params.class || '', subject: params.subject || '', type: params.type || '' },
    total_results: 0,
    results: [],
  };
}

export async function getSitemapData() {
  return await fetchApi<{
    urls: Array<{ path: string; priority: string; changefreq: string; lastmod?: string }>;
  }>('/api/sitemap-data/', {
    cache: 'no-store',
  });
}

// ==============================================================================
// Admin API (Client-side authenticated)
// ==============================================================================
export interface AdminUser {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; error?: string; user?: AdminUser }> {
  const res = await fetch(`${API_BASE}/api/admin/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Login failed' };
  }
  return { success: true, user: data.user };
}

export async function adminLogout(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/admin/auth/logout/`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.ok;
}

export async function adminGetMe(): Promise<{ authenticated: boolean; user: AdminUser | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/auth/me/`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return { authenticated: false, user: null };
    return await res.json();
  } catch {
    return { authenticated: false, user: null };
  }
}

export async function adminGetResources(filters: {
  q?: string;
  class?: string;
  subject?: string;
  status?: string;
} = {}): Promise<ResourceItem[]> {
  const queryParts: string[] = [];
  if (filters.q) queryParts.push(`q=${encodeURIComponent(filters.q)}`);
  if (filters.class) queryParts.push(`class=${encodeURIComponent(filters.class)}`);
  if (filters.subject) queryParts.push(`subject=${encodeURIComponent(filters.subject)}`);
  if (filters.status) queryParts.push(`status=${encodeURIComponent(filters.status)}`);

  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const data = await fetchApi<{ total: number; resources: ResourceItem[] }>(`/api/admin/resources/${qs}`, {
    cache: 'no-store',
  });
  return data?.resources || [];
}

export async function adminGetResource(id: number | string): Promise<ResourceItem | null> {
  return await fetchApi<ResourceItem>(`/api/admin/resources/${id}/`, {
    cache: 'no-store',
  });
}

export async function adminCreateResource(formData: FormData): Promise<{ success: boolean; id?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/resources/`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to create resource' };
  }
  return { success: true, id: data.id };
}

export async function adminUpdateResource(id: number | string, payload: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/resources/${id}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to update resource' };
  }
  return { success: true };
}

export async function adminUploadPdf(id: number | string, file: File): Promise<{ success: boolean; error?: string; file_size_bytes?: number }> {
  const formData = new FormData();
  formData.append('pdf_file', file);

  const res = await fetch(`${API_BASE}/api/admin/resources/${id}/upload-pdf/`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to upload PDF' };
  }
  return { success: true, file_size_bytes: data.file_size_bytes };
}

export async function adminTogglePublish(id: number | string): Promise<{ success: boolean; is_published?: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/resources/${id}/toggle-publish/`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to toggle publication status' };
  }
  return { success: true, is_published: data.is_published };
}

export async function adminDeleteResource(id: number | string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/resources/${id}/`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to delete resource' };
  }
  return { success: true };
}

export async function adminGetStructure() {
  return await fetchApi<{
    classes: Array<{
      id: number;
      name: string;
      grade_number: number;
      slug: string;
      class_subjects: Array<{
        id: number;
        subject_id: number;
        subject_name: string;
        subject_slug: string;
        total_chapters: number;
        chapters: ChapterItem[];
      }>;
    }>;
    subjects: Array<{ id: number; name: string; slug: string; code: string; icon_name: string }>;
  }>('/api/admin/structure/', {
    cache: 'no-store',
  });
}

export async function adminCreateSubject(payload: {
  name: string;
  slug?: string;
  code?: string;
  icon_name?: string;
  description?: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/structure/subjects/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to create subject' };
  }
  return { success: true, id: data.id };
}

export async function adminCreateChapter(payload: {
  class_subject_id: number;
  chapter_number: number;
  title: string;
  slug?: string;
  overview?: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/structure/chapters/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to create chapter' };
  }
  return { success: true, id: data.id };
}

// ==============================================================================
// Phase 4: Student Accounts & Dashboard API
// ==============================================================================
export interface StudentUser {
  id: number;
  email: string;
  full_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  purchases_count?: number;
  date_joined?: string;
}

export interface PurchaseItem {
  purchase_id: number;
  resource_id: number;
  title: string;
  slug: string;
  class_name: string;
  class_slug: string;
  subject_name: string;
  subject_slug: string;
  file_format: string;
  page_count: number;
  file_size_bytes: number;
  has_pdf: boolean;
  access_granted_at: string;
  download_url: string;
  public_url: string;
  order_reference: string;
  amount_paid: string;
  currency: string;
}

export interface OrderItem {
  id: number;
  order_reference: string;
  resource_title: string;
  amount: string;
  currency: string;
  payment_gateway: string;
  status: string;
  status_display: string;
  created_at: string;
  paid_at?: string | null;
  student_id?: number;
  student_email?: string;
  student_name?: string;
  class_name?: string;
  subject_name?: string;
  gateway_reference?: string;
}

export interface GatewayItem {
  id: string;
  name: string;
  description: string;
  is_live: boolean;
  badge: string;
}

export interface StudentDashboardData {
  student: StudentUser;
  purchases: PurchaseItem[];
  orders: OrderItem[];
}

export async function studentRegister(payload: {
  full_name: string;
  email: string;
  password: string;
  password_confirm: string;
}): Promise<{ success: boolean; user?: StudentUser; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Registration failed' };
  }
  return { success: true, user: data.user };
}

export async function studentLogin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: StudentUser; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Login failed' };
  }
  return { success: true, user: data.user };
}

export async function studentLogout(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth/logout/`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.ok;
}

export async function studentGetMe(): Promise<{ authenticated: boolean; user: StudentUser | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me/`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return { authenticated: false, user: null };
    return await res.json();
  } catch {
    return { authenticated: false, user: null };
  }
}

export async function studentRequestPasswordReset(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/password-reset/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Password reset request failed' };
  }
  return { success: true, message: data.message };
}

export async function studentConfirmPasswordReset(payload: {
  uid: string;
  token: string;
  new_password: string;
  new_password_confirm: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/password-reset-confirm/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to reset password' };
  }
  return { success: true, message: data.message };
}

export async function studentGetDashboard(): Promise<StudentDashboardData | null> {
  return await fetchApi<StudentDashboardData>('/api/student/dashboard/', {
    cache: 'no-store',
  });
}

// ==============================================================================
// Phase 4: Orders & Checkout API
// ==============================================================================
export async function getPaymentGateways(): Promise<GatewayItem[]> {
  const data = await fetchApi<{ gateways: GatewayItem[] }>('/api/gateways/', {
    cache: 'no-store',
  });
  return data?.gateways || [];
}

export async function createOrder(payload: {
  resource_id?: number;
  resource_slug?: string;
  gateway_id?: string;
  return_url?: string;
}): Promise<{
  success: boolean;
  already_owned?: boolean;
  order_reference?: string;
  amount?: string;
  currency?: string;
  payment?: {
    gateway: string;
    gateway_name: string;
    action_type: string;
    action_url: string;
    form_data?: Record<string, string>;
  };
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/orders/create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to create order' };
  }
  return data;
}

export async function getOrderStatus(orderReference: string): Promise<{
  order_reference: string;
  status: string;
  is_paid: boolean;
  amount: string;
  currency: string;
  payment_gateway: string;
  gateway_reference?: string;
  created_at: string;
  paid_at?: string | null;
  resource?: {
    id: number;
    title: string;
    slug: string;
    download_url?: string | null;
    public_url?: string;
  };
  error?: string;
} | null> {
  return await fetchApi(`/api/orders/${encodeURIComponent(orderReference)}/status/`, {
    cache: 'no-store',
  });
}

export async function sandboxSimulatePay(orderReference: string): Promise<{ success: boolean; status?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/payments/sandbox-pay/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_reference: orderReference }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Sandbox payment simulation failed' };
  }
  return data;
}

// ==============================================================================
// Phase 4: Admin Orders & Sales Management API
// ==============================================================================
export async function adminGetOrders(filters: {
  q?: string;
  status?: string;
  gateway?: string;
} = {}): Promise<{
  total_orders: number;
  paid_orders_count: number;
  total_revenue_pkr: string;
  orders: OrderItem[];
} | null> {
  const queryParts: string[] = [];
  if (filters.q) queryParts.push(`q=${encodeURIComponent(filters.q)}`);
  if (filters.status) queryParts.push(`status=${encodeURIComponent(filters.status)}`);
  if (filters.gateway) queryParts.push(`gateway=${encodeURIComponent(filters.gateway)}`);

  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return await fetchApi(`/api/admin/orders/${qs}`, {
    cache: 'no-store',
  });
}

export async function adminRefundOrder(orderId: number | string, reason: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/refund/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to refund order' };
  }
  return { success: true, message: data.message };
}

// ==============================================================================
// Interactive Learning & Chapter Practice System API
// ==============================================================================

export interface PracticeTopicItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  question_count: number;
  status?: {
    attempted: boolean;
    is_completed: boolean;
    accuracy_percentage: number;
    score: number;
    correct_answers: number;
    total_questions: number;
  };
  chapter_id?: number;
  chapter_title?: string;
  chapter_number?: number;
  subject_name?: string;
  class_name?: string;
  is_published?: boolean;
}

export interface PracticeChapterItem {
  id: number;
  chapter_number: number;
  title: string;
  slug: string;
  overview: string;
  topics: PracticeTopicItem[];
}

export interface SubjectPracticeDirectoryResponse {
  class_level: {
    name: string;
    slug: string;
    grade_number: number;
  };
  subject: {
    name: string;
    slug: string;
    code: string;
    icon_name: string;
  };
  chapters: PracticeChapterItem[];
  total_topics: number;
}

export interface QuestionOptionItem {
  id: number;
  option_text: string;
  order: number;
  is_correct?: boolean;
}

export interface QuestionAcceptedAnswerItem {
  id: number;
  accepted_text: string;
  is_case_sensitive: boolean;
}

export interface QuestionItem {
  id: number;
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer';
  prompt: string;
  points: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  options: QuestionOptionItem[];
  is_answered: boolean;
  attempt?: {
    selected_option_id?: number | null;
    text_answer?: string;
    is_correct: boolean;
    points_awarded: number;
    explanation: string;
    correct_answer_display: string;
  } | null;
}

export interface PracticeSessionState {
  session_id: number;
  session_uuid: string;
  is_completed: boolean;
  score: number;
  correct_answers: number;
  total_questions: number;
  answered_count: number;
  accuracy_percentage: number;
  topic: {
    id: number;
    title: string;
    slug: string;
    difficulty: string;
    chapter_title: string;
    chapter_number: number;
    subject_name: string;
    subject_slug: string;
    class_name: string;
    class_slug: string;
  };
  questions: QuestionItem[];
}

export interface QuestionSubmitResult {
  success: boolean;
  already_attempted?: boolean;
  is_correct: boolean;
  points_awarded: number;
  explanation: string;
  correct_answer_display: string;
  session_summary: {
    session_uuid: string;
    correct_answers: number;
    total_answered: number;
    total_questions: number;
    score: number;
    accuracy_percentage: number;
    is_all_completed: boolean;
  };
  error?: string;
}

export interface PracticeSessionRecap {
  success: boolean;
  session_uuid: string;
  is_completed: boolean;
  completed_at: string;
  total_questions: number;
  total_answered: number;
  correct_answers: number;
  score: number;
  accuracy_percentage: number;
  topic: {
    id: number;
    title: string;
    slug: string;
    chapter_title: string;
    chapter_number: number;
    subject_name: string;
    subject_slug: string;
    class_name: string;
    class_slug: string;
  };
  incorrect_question_ids: number[];
  attempts: Array<{
    question_id: number;
    prompt: string;
    question_type: string;
    is_correct: boolean;
    points_awarded: number;
    student_answer: string;
    correct_answer: string;
    explanation: string;
  }>;
}

export interface StudentPracticeProgress {
  total_sessions_completed: number;
  total_questions_attempted: number;
  total_correct: number;
  overall_accuracy: number;
  total_score: number;
  recent_sessions: Array<{
    session_uuid: string;
    topic_id: number;
    topic_title: string;
    topic_slug: string;
    chapter_title: string;
    chapter_number: number;
    subject_name: string;
    class_name: string;
    correct_answers: number;
    total_questions: number;
    accuracy_percentage: number;
    score: number;
    completed_at: string;
  }>;
}

export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('fbise_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('fbise_guest_id', id);
  }
  return id;
}

export async function getSubjectPracticeDirectory(
  classSlug: string,
  subjectSlug: string,
  guestIdentifier: string = ''
): Promise<SubjectPracticeDirectoryResponse | null> {
  const query = guestIdentifier ? `?guest_identifier=${encodeURIComponent(guestIdentifier)}` : '';
  return await fetchApi(`/api/classes/${classSlug}/${subjectSlug}/practice/${query}`, {
    cache: 'no-store',
  });
}

export async function getPracticeTopicDetail(topicSlug: string): Promise<any | null> {
  return await fetchApi(`/api/practice/topics/${topicSlug}/`, {
    cache: 'no-store',
  });
}

export async function startPracticeSession(
  topicSlug: string,
  params: {
    guest_identifier?: string;
    force_new?: boolean;
    retry_question_ids?: number[];
  } = {}
): Promise<PracticeSessionState | null> {
  const res = await fetch(`${API_BASE}/api/practice/topics/${topicSlug}/start/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include',
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function submitPracticeAnswer(
  questionId: number,
  params: {
    session_uuid: string;
    selected_option_id?: number | null;
    text_answer?: string;
  }
): Promise<QuestionSubmitResult> {
  const res = await fetch(`${API_BASE}/api/practice/questions/${questionId}/submit/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      is_correct: false,
      points_awarded: 0,
      explanation: '',
      correct_answer_display: '',
      session_summary: {
        session_uuid: params.session_uuid,
        correct_answers: 0,
        total_answered: 0,
        total_questions: 0,
        score: 0,
        accuracy_percentage: 0,
        is_all_completed: false,
      },
      error: data.error || 'Failed to submit answer',
    };
  }
  return data;
}

export async function finishPracticeSession(sessionUuid: string): Promise<PracticeSessionRecap | null> {
  const res = await fetch(`${API_BASE}/api/practice/sessions/${sessionUuid}/finish/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function getStudentPracticeProgress(guestIdentifier: string = ''): Promise<StudentPracticeProgress | null> {
  const query = guestIdentifier ? `?guest_identifier=${encodeURIComponent(guestIdentifier)}` : '';
  return await fetchApi(`/api/student/practice-progress/${query}`, {
    cache: 'no-store',
  });
}

// ------------------------------------------------------------------------------
// Admin Practice Management APIs
// ------------------------------------------------------------------------------

export async function adminGetPracticeOverview(): Promise<{ classes: any[] } | null> {
  return await fetchApi('/api/admin/practice/overview/', {
    cache: 'no-store',
  });
}

export async function adminGetPracticeTopics(chapterId?: number): Promise<{ topics: PracticeTopicItem[] } | null> {
  const qs = chapterId ? `?chapter_id=${chapterId}` : '';
  return await fetchApi(`/api/admin/practice/topics/${qs}`, {
    cache: 'no-store',
  });
}

export async function adminCreatePracticeTopic(data: {
  chapter_id: number;
  title: string;
  slug?: string;
  description?: string;
  difficulty?: string;
  order?: number;
  is_published?: boolean;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/practice/topics/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || 'Failed to create topic' };
  return { success: true, id: json.id };
}

export async function adminUpdatePracticeTopic(
  topicId: number,
  data: Partial<{
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    order: number;
    is_published: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/practice/topics/${topicId}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || 'Failed to update topic' };
  return { success: true };
}

export async function adminDeletePracticeTopic(topicId: number): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/practice/topics/${topicId}/`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || 'Failed to delete topic' };
  return { success: true };
}

export async function adminGetPracticeQuestions(topicId?: number): Promise<{ questions: any[] } | null> {
  const qs = topicId ? `?topic_id=${topicId}` : '';
  return await fetchApi(`/api/admin/practice/questions/${qs}`, {
    cache: 'no-store',
  });
}

export async function adminCreatePracticeQuestion(data: any): Promise<{ success: boolean; id?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/practice/questions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || 'Failed to create question' };
  return { success: true, id: json.id };
}

export async function adminUpdatePracticeQuestion(
  questionId: number,
  data: any
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/practice/questions/${questionId}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || 'Failed to update question' };
  return { success: true };
}

export async function adminDeletePracticeQuestion(questionId: number): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/practice/questions/${questionId}/`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || 'Failed to delete question' };
  return { success: true };
}

export async function adminBulkImportQuestions(payload: {
  questions?: any[];
  formData?: FormData;
}): Promise<{ success: boolean; created_count?: number; errors?: string[]; error?: string }> {
  let res: Response;
  if (payload.formData) {
    res = await fetch(`${API_BASE}/api/admin/practice/questions/bulk-import/`, {
      method: 'POST',
      body: payload.formData,
      credentials: 'include',
    });
  } else {
    res = await fetch(`${API_BASE}/api/admin/practice/questions/bulk-import/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: payload.questions }),
      credentials: 'include',
    });
  }
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || 'Bulk import failed' };
  return json;
}



