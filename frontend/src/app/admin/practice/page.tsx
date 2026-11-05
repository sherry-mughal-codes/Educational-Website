'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/AdminNav';
import {
  adminGetPracticeOverview,
  adminGetPracticeQuestions,
  adminCreatePracticeTopic,
  adminUpdatePracticeTopic,
  adminDeletePracticeTopic,
  adminCreatePracticeQuestion,
  adminUpdatePracticeQuestion,
  adminDeletePracticeQuestion,
  adminBulkImportQuestions,
} from '@/lib/api';

export default function AdminPracticePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [classesData, setClassesData] = useState<any[]>([]);

  // Selection filters
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  // Questions for active topic
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState<boolean>(false);

  // Modals state
  const [showTopicModal, setShowTopicModal] = useState<boolean>(false);
  const [topicModalMode, setTopicModalMode] = useState<'create' | 'edit'>('create');
  const [currentTopic, setCurrentTopic] = useState<any>(null);

  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [questionModalMode, setQuestionModalMode] = useState<'create' | 'edit'>('create');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Load overview hierarchy
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetPracticeOverview();
      if (data && data.classes) {
        setClassesData(data.classes);
        if (data.classes.length > 0 && !selectedClassId) {
          const firstCls = data.classes[0];
          setSelectedClassId(firstCls.id);
          if (firstCls.subjects && firstCls.subjects.length > 0) {
            setSelectedSubjectId(firstCls.subjects[0].id);
            if (firstCls.subjects[0].chapters && firstCls.subjects[0].chapters.length > 0) {
              const firstCh = firstCls.subjects[0].chapters[0];
              setSelectedChapterId(firstCh.id);
              if (firstCh.topics && firstCh.topics.length > 0) {
                setSelectedTopicId(firstCh.topics[0].id);
              }
            }
          }
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load curriculum overview');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Load questions when selectedTopicId changes
  const loadQuestions = useCallback(async () => {
    if (!selectedTopicId) {
      setQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    try {
      const data = await adminGetPracticeQuestions(selectedTopicId);
      if (data && data.questions) {
        setQuestions(data.questions);
      } else {
        setQuestions([]);
      }
    } catch {
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedTopicId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Get active entities from tree
  const activeClass = classesData.find((c) => c.id === selectedClassId);
  const activeSubject = activeClass?.subjects?.find((s: any) => s.id === selectedSubjectId);
  const activeChapter = activeSubject?.chapters?.find((ch: any) => ch.id === selectedChapterId);
  const activeTopic = activeChapter?.topics?.find((tp: any) => tp.id === selectedTopicId);

  // Handle Delete Topic
  const handleDeleteTopic = async (topicId: number) => {
    if (!confirm('Are you sure you want to delete this practice topic and all its questions?')) return;
    const res = await adminDeletePracticeTopic(topicId);
    if (res.success) {
      await loadOverview();
      if (selectedTopicId === topicId) setSelectedTopicId(null);
    } else {
      alert(res.error || 'Failed to delete topic');
    }
  };

  // Handle Delete Question
  const handleDeleteQuestion = async (qId: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    const res = await adminDeletePracticeQuestion(qId);
    if (res.success) {
      await loadQuestions();
      await loadOverview();
    } else {
      alert(res.error || 'Failed to delete question');
    }
  };

  // Bulk Import Submit
  const handleBulkImport = async () => {
    if (!importJsonText.trim()) return;
    setImporting(true);
    setImportResult(null);

    try {
      const parsed = JSON.parse(importJsonText);
      const questionsList = Array.isArray(parsed) ? parsed : parsed.questions;

      if (!questionsList || !Array.isArray(questionsList)) {
        alert('JSON must be an array of questions or an object with a "questions" array property.');
        setImporting(false);
        return;
      }

      const res = await adminBulkImportQuestions({ questions: questionsList });
      if (res.success) {
        setImportResult(`Successfully imported ${res.created_count} questions.`);
        setImportJsonText('');
        await loadOverview();
        if (selectedTopicId) await loadQuestions();
      } else {
        alert(res.error || 'Bulk import failed');
      }
    } catch (err: any) {
      alert('Invalid JSON syntax: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '4rem' }}>
      <AdminNav />

      <div className="container" style={{ maxWidth: '1240px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎯</span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Interactive Practice &amp; Question Bank
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: 0 }}>
              Author, edit, and organize FBISE chapter-based practice topics, MCQs, fill-in-the-blanks, and numerical exercises.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setImportResult(null);
                setShowImportModal(true);
              }}
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              📁 Bulk Import (JSON/CSV)
            </button>

            {selectedChapterId && (
              <button
                onClick={() => {
                  setCurrentTopic({ chapter_id: selectedChapterId, title: '', difficulty: 'intermediate', order: 1, is_published: true });
                  setTopicModalMode('create');
                  setShowTopicModal(true);
                }}
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)',
                }}
              >
                + Add Practice Topic
              </button>
            )}

            {selectedTopicId && (
              <button
                onClick={() => {
                  setCurrentQuestion({
                    topic_id: selectedTopicId,
                    question_type: 'mcq',
                    prompt: '',
                    explanation: '',
                    points: 10,
                    difficulty: 'intermediate',
                    order: questions.length + 1,
                    is_published: true,
                    options: [
                      { option_text: '', is_correct: true, order: 1 },
                      { option_text: '', is_correct: false, order: 2 },
                      { option_text: '', is_correct: false, order: 3 },
                      { option_text: '', is_correct: false, order: 4 },
                    ],
                    accepted_answers: [{ accepted_text: '', is_case_sensitive: false }],
                  });
                  setQuestionModalMode('create');
                  setShowQuestionModal(true);
                }}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
                }}
              >
                + Add Question
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
          {/* Class Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.375rem' }}>
              Class Level
            </label>
            <select
              value={selectedClassId || ''}
              onChange={(e) => {
                const cId = Number(e.target.value);
                setSelectedClassId(cId);
                const cls = classesData.find((c) => c.id === cId);
                if (cls && cls.subjects.length > 0) {
                  setSelectedSubjectId(cls.subjects[0].id);
                  if (cls.subjects[0].chapters.length > 0) {
                    setSelectedChapterId(cls.subjects[0].chapters[0].id);
                    setSelectedTopicId(cls.subjects[0].chapters[0].topics[0]?.id || null);
                  } else {
                    setSelectedChapterId(null);
                    setSelectedTopicId(null);
                  }
                } else {
                  setSelectedSubjectId(null);
                  setSelectedChapterId(null);
                  setSelectedTopicId(null);
                }
              }}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              {classesData.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.375rem' }}>
              Subject
            </label>
            <select
              value={selectedSubjectId || ''}
              disabled={!activeClass || !activeClass.subjects?.length}
              onChange={(e) => {
                const sId = Number(e.target.value);
                setSelectedSubjectId(sId);
                const sub = activeClass?.subjects.find((s: any) => s.id === sId);
                if (sub && sub.chapters.length > 0) {
                  setSelectedChapterId(sub.chapters[0].id);
                  setSelectedTopicId(sub.chapters[0].topics[0]?.id || null);
                } else {
                  setSelectedChapterId(null);
                  setSelectedTopicId(null);
                }
              }}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              {activeClass?.subjects?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.375rem' }}>
              Chapter
            </label>
            <select
              value={selectedChapterId || ''}
              disabled={!activeSubject || !activeSubject.chapters?.length}
              onChange={(e) => {
                const chId = Number(e.target.value);
                setSelectedChapterId(chId);
                const ch = activeSubject?.chapters.find((c: any) => c.id === chId);
                setSelectedTopicId(ch?.topics[0]?.id || null);
              }}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              {activeSubject?.chapters?.map((ch: any) => (
                <option key={ch.id} value={ch.id}>
                  Ch {ch.chapter_number}: {ch.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Layout: Topics Sidebar + Questions Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Topics List Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                Practice Topics ({activeChapter?.topics?.length || 0})
              </span>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {!activeChapter || !activeChapter.topics || activeChapter.topics.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No practice topics in this chapter yet.
                </div>
              ) : (
                activeChapter.topics.map((tp: any) => {
                  const isSelected = selectedTopicId === tp.id;
                  return (
                    <div
                      key={tp.id}
                      onClick={() => setSelectedTopicId(tp.id)}
                      style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isSelected ? '#f0fdf4' : '#ffffff',
                        borderLeft: isSelected ? '4px solid #047857' : '4px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                          background: tp.is_published ? '#ecfdf5' : '#fef2f2',
                          color: tp.is_published ? '#047857' : '#991b1b',
                        }}>
                          {tp.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {tp.question_count} Qs
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: isSelected ? '#064e3b' : '#1e293b', marginBottom: '0.5rem' }}>
                        {tp.title}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTopic(tp);
                            setTopicModalMode('edit');
                            setShowTopicModal(true);
                          }}
                          style={{
                            fontSize: '0.75rem',
                            color: '#047857',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Edit
                        </button>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(tp.id);
                          }}
                          style={{
                            fontSize: '0.75rem',
                            color: '#be123c',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Questions Panel */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                  {activeTopic ? `Topic: ${activeTopic.title}` : 'Select a topic'}
                </span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0.125rem 0 0 0' }}>
                  Questions ({questions.length})
                </h2>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {questionsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Loading questions...
                </div>
              ) : questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                  <p style={{ margin: '0 0 1rem 0' }}>No questions authored in this topic yet.</p>
                  {selectedTopicId && (
                    <button
                      onClick={() => {
                        setCurrentQuestion({
                          topic_id: selectedTopicId,
                          question_type: 'mcq',
                          prompt: '',
                          explanation: '',
                          points: 10,
                          difficulty: 'intermediate',
                          order: 1,
                          is_published: true,
                          options: [
                            { option_text: '', is_correct: true, order: 1 },
                            { option_text: '', is_correct: false, order: 2 },
                          ],
                          accepted_answers: [],
                        });
                        setQuestionModalMode('create');
                        setShowQuestionModal(true);
                      }}
                      style={{
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Add First Question
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        background: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b' }}>
                            Q{idx + 1}
                          </span>
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '4px',
                          }}>
                            {q.question_type}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            • {q.points} pts
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setCurrentQuestion(q);
                              setQuestionModalMode('edit');
                              setShowQuestionModal(true);
                            }}
                            style={{
                              fontSize: '0.75rem',
                              color: '#047857',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              padding: '0.25rem 0.625rem',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            style={{
                              fontSize: '0.75rem',
                              color: '#be123c',
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              padding: '0.25rem 0.625rem',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                        {q.prompt}
                      </p>

                      {/* Display Options if MCQ / True-False */}
                      {q.options && q.options.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          {q.options.map((opt: any) => (
                            <div
                              key={opt.id}
                              style={{
                                fontSize: '0.8125rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                background: opt.is_correct ? '#ecfdf5' : '#f8fafc',
                                border: `1px solid ${opt.is_correct ? '#a7f3d0' : '#e2e8f0'}`,
                                color: opt.is_correct ? '#065f46' : '#475569',
                                fontWeight: opt.is_correct ? 600 : 400,
                              }}
                            >
                              {opt.is_correct ? '✓ ' : '• '} {opt.option_text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Accepted answers for short answer */}
                      {q.accepted_answers && q.accepted_answers.length > 0 && (
                        <div style={{ fontSize: '0.8125rem', color: '#047857', marginBottom: '0.75rem' }}>
                          <strong>Accepted Answers:</strong> {q.accepted_answers.map((a: any) => a.accepted_text).join(' | ')}
                        </div>
                      )}

                      {q.explanation && (
                        <div style={{
                          fontSize: '0.8125rem',
                          background: '#f8fafc',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          color: '#475569',
                          border: '1px solid #f1f5f9',
                          lineHeight: 1.5,
                        }}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* Topic Modal */}
      {/* ---------------------------------------------------------------------- */}
      {showTopicModal && currentTopic && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0' }}>
              {topicModalMode === 'create' ? 'Create Practice Topic' : 'Edit Practice Topic'}
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (topicModalMode === 'create') {
                  const res = await adminCreatePracticeTopic({
                    chapter_id: currentTopic.chapter_id,
                    title: currentTopic.title,
                    description: currentTopic.description,
                    difficulty: currentTopic.difficulty,
                    order: Number(currentTopic.order),
                    is_published: currentTopic.is_published,
                  });
                  if (res.success) {
                    setShowTopicModal(false);
                    await loadOverview();
                  } else {
                    alert(res.error || 'Failed to create topic');
                  }
                } else {
                  const res = await adminUpdatePracticeTopic(currentTopic.id, {
                    title: currentTopic.title,
                    description: currentTopic.description,
                    difficulty: currentTopic.difficulty,
                    order: Number(currentTopic.order),
                    is_published: currentTopic.is_published,
                  });
                  if (res.success) {
                    setShowTopicModal(false);
                    await loadOverview();
                  } else {
                    alert(res.error || 'Failed to update topic');
                  }
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={currentTopic.title || ''}
                  onChange={(e) => setCurrentTopic({ ...currentTopic, title: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  placeholder="e.g. Calculating Centripetal Acceleration"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Description / SLO Outcome
                </label>
                <textarea
                  rows={2}
                  value={currentTopic.description || ''}
                  onChange={(e) => setCurrentTopic({ ...currentTopic, description: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Difficulty
                  </label>
                  <select
                    value={currentTopic.difficulty || 'intermediate'}
                    onChange={(e) => setCurrentTopic({ ...currentTopic, difficulty: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Order
                  </label>
                  <input
                    type="number"
                    value={currentTopic.order || 1}
                    onChange={(e) => setCurrentTopic({ ...currentTopic, order: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="topic_published"
                  checked={Boolean(currentTopic.is_published)}
                  onChange={(e) => setCurrentTopic({ ...currentTopic, is_published: e.target.checked })}
                />
                <label htmlFor="topic_published" style={{ fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                  Publish topic immediately for student practice
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  style={{
                    padding: '0.625rem 1rem',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: '#047857',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Question Modal (Supports MCQ, True/False, Fill Blank, Short Answer) */}
      {/* ---------------------------------------------------------------------- */}
      {showQuestionModal && currentQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem',
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0' }}>
              {questionModalMode === 'create' ? 'Add Practice Question' : 'Edit Practice Question'}
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (questionModalMode === 'create') {
                  const res = await adminCreatePracticeQuestion({
                    topic_id: currentQuestion.topic_id,
                    question_type: currentQuestion.question_type,
                    prompt: currentQuestion.prompt,
                    explanation: currentQuestion.explanation,
                    points: Number(currentQuestion.points || 10),
                    difficulty: currentQuestion.difficulty,
                    order: Number(currentQuestion.order || 1),
                    is_published: currentQuestion.is_published,
                    options: currentQuestion.options,
                    accepted_answers: currentQuestion.accepted_answers,
                  });
                  if (res.success) {
                    setShowQuestionModal(false);
                    await loadQuestions();
                    await loadOverview();
                  } else {
                    alert(res.error || 'Failed to create question');
                  }
                } else {
                  const res = await adminUpdatePracticeQuestion(currentQuestion.id, {
                    question_type: currentQuestion.question_type,
                    prompt: currentQuestion.prompt,
                    explanation: currentQuestion.explanation,
                    points: Number(currentQuestion.points || 10),
                    difficulty: currentQuestion.difficulty,
                    order: Number(currentQuestion.order || 1),
                    is_published: currentQuestion.is_published,
                    options: currentQuestion.options,
                    accepted_answers: currentQuestion.accepted_answers,
                  });
                  if (res.success) {
                    setShowQuestionModal(false);
                    await loadQuestions();
                  } else {
                    alert(res.error || 'Failed to update question');
                  }
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Question Type *
                  </label>
                  <select
                    value={currentQuestion.question_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let newOptions = currentQuestion.options || [];
                      if (newType === 'true_false') {
                        newOptions = [
                          { option_text: 'True', is_correct: true, order: 1 },
                          { option_text: 'False', is_correct: false, order: 2 },
                        ];
                      }
                      setCurrentQuestion({ ...currentQuestion, question_type: newType, options: newOptions });
                    }}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="true_false">True / False</option>
                    <option value="fill_blank">Fill in the Blank</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Points
                  </label>
                  <input
                    type="number"
                    value={currentQuestion.points || 10}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Question Prompt / Problem Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  value={currentQuestion.prompt || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, prompt: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  placeholder="Enter problem statement or prompt..."
                />
              </div>

              {/* Options Table for MCQ / True False */}
              {(currentQuestion.question_type === 'mcq' || currentQuestion.question_type === 'true_false') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                      Options (Check the radio/box for the correct answer)
                    </label>
                    {currentQuestion.question_type === 'mcq' && (
                      <button
                        type="button"
                        onClick={() => {
                          const opts = [...(currentQuestion.options || [])];
                          opts.push({ option_text: '', is_correct: false, order: opts.length + 1 });
                          setCurrentQuestion({ ...currentQuestion, options: opts });
                        }}
                        style={{ fontSize: '0.75rem', color: '#047857', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        + Add Option
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentQuestion.options?.map((opt: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          name="correct_option"
                          checked={Boolean(opt.is_correct)}
                          onChange={() => {
                            const opts = currentQuestion.options.map((o: any, i: number) => ({
                              ...o,
                              is_correct: i === idx,
                            }));
                            setCurrentQuestion({ ...currentQuestion, options: opts });
                          }}
                        />
                        <input
                          type="text"
                          required
                          value={opt.option_text || ''}
                          onChange={(e) => {
                            const opts = [...currentQuestion.options];
                            opts[idx].option_text = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, options: opts });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                        {currentQuestion.question_type === 'mcq' && currentQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const opts = currentQuestion.options.filter((_: any, i: number) => i !== idx);
                              setCurrentQuestion({ ...currentQuestion, options: opts });
                            }}
                            style={{ color: '#be123c', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accepted Answers for Fill Blank / Short Answer */}
              {(currentQuestion.question_type === 'fill_blank' || currentQuestion.question_type === 'short_answer') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                      Accepted Answer Variants (Normalized &amp; Case-Insensitive)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const acc = [...(currentQuestion.accepted_answers || [])];
                        acc.push({ accepted_text: '', is_case_sensitive: false });
                        setCurrentQuestion({ ...currentQuestion, accepted_answers: acc });
                      }}
                      style={{ fontSize: '0.75rem', color: '#047857', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      + Add Accepted Variant
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentQuestion.accepted_answers?.map((acc: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="text"
                          required
                          value={acc.accepted_text || ''}
                          onChange={(e) => {
                            const list = [...currentQuestion.accepted_answers];
                            list[idx].accepted_text = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, accepted_answers: list });
                          }}
                          placeholder="e.g. 9.8 m/s^2 or Kelvin"
                          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                        {currentQuestion.accepted_answers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const list = currentQuestion.accepted_answers.filter((_: any, i: number) => i !== idx);
                              setCurrentQuestion({ ...currentQuestion, accepted_answers: list });
                            }}
                            style={{ color: '#be123c', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Educational Explanation * (Shown strictly after answering)
                </label>
                <textarea
                  rows={3}
                  required
                  value={currentQuestion.explanation || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  placeholder="Explain why this answer is correct according to FBISE standards..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  style={{
                    padding: '0.625rem 1rem',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: '#047857',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Bulk Import Modal */}
      {/* ---------------------------------------------------------------------- */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Bulk Import Questions
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Paste a JSON array of questions with <code>topic_id</code> or <code>topic_slug</code>.
            </p>

            {importResult && (
              <div style={{
                padding: '0.75rem',
                background: '#ecfdf5',
                color: '#065f46',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                {importResult}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                JSON Payload:
              </label>
              <textarea
                rows={10}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder={`[
  {
    "topic_slug": "si-base-units-and-prefixes",
    "question_type": "mcq",
    "prompt": "What is the SI unit of mass?",
    "explanation": "The SI base unit of mass is the kilogram (kg).",
    "points": 10,
    "options": [
      { "option_text": "Kilogram", "is_correct": true },
      { "option_text": "Gram", "is_correct": false }
    ]
  }
]`}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8125rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '0.625rem 1rem',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                disabled={importing || !importJsonText.trim()}
                onClick={handleBulkImport}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: importing ? 'wait' : 'pointer',
                }}
              >
                {importing ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
