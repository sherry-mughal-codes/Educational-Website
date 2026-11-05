'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Custom styled delete confirmation states
  const [topicToDelete, setTopicToDelete] = useState<any | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState<boolean>(false);

  const [questionToDelete, setQuestionToDelete] = useState<any | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState<boolean>(false);

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

  // Active entities
  const activeClass = classesData.find((c) => c.id === selectedClassId);
  const activeSubject = activeClass?.subjects?.find((s: any) => s.id === selectedSubjectId);
  const activeChapter = activeSubject?.chapters?.find((ch: any) => ch.id === selectedChapterId);
  const activeTopic = activeChapter?.topics?.find((tp: any) => tp.id === selectedTopicId);

  // Flattened lists for modal dropdowns
  const allChaptersList = useMemo(() => {
    const list: Array<{ id: number; label: string; classId: number; subjectId: number }> = [];
    classesData.forEach((cl) => {
      cl.subjects?.forEach((sub: any) => {
        sub.chapters?.forEach((ch: any) => {
          list.push({
            id: ch.id,
            label: `${cl.name} → ${sub.name} → Ch ${ch.chapter_number}: ${ch.title}`,
            classId: cl.id,
            subjectId: sub.id,
          });
        });
      });
    });
    return list;
  }, [classesData]);

  const allTopicsList = useMemo(() => {
    const list: Array<{ id: number; label: string; chapterId: number }> = [];
    classesData.forEach((cl) => {
      cl.subjects?.forEach((sub: any) => {
        sub.chapters?.forEach((ch: any) => {
          ch.topics?.forEach((tp: any) => {
            list.push({
              id: tp.id,
              label: `${cl.name} • ${sub.name} • Ch ${ch.chapter_number} → ${tp.title}`,
              chapterId: ch.id,
            });
          });
        });
      });
    });
    return list;
  }, [classesData]);

  // Open Topic Modal Helper
  const openAddTopicModal = () => {
    const defaultChapterId = selectedChapterId || (allChaptersList.length > 0 ? allChaptersList[0].id : 1);
    setCurrentTopic({
      chapter_id: defaultChapterId,
      title: '',
      description: '',
      difficulty: 'intermediate',
      order: (activeChapter?.topics?.length || 0) + 1,
      is_published: true,
    });
    setTopicModalMode('create');
    setShowTopicModal(true);
  };

  // Open Question Modal Helper
  const openAddQuestionModal = () => {
    const defaultTopicId = selectedTopicId || (allTopicsList.length > 0 ? allTopicsList[0].id : 1);
    setCurrentQuestion({
      topic_id: defaultTopicId,
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
  };

  // Delete Topic Confirmation
  const handleConfirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    setIsDeletingTopic(true);
    try {
      const res = await adminDeletePracticeTopic(topicToDelete.id);
      if (res.success) {
        if (selectedTopicId === topicToDelete.id) {
          setSelectedTopicId(null);
        }
        setTopicToDelete(null);
        await loadOverview();
      } else {
        alert(res.error || 'Failed to delete topic');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting topic');
    } finally {
      setIsDeletingTopic(false);
    }
  };

  // Delete Question Confirmation
  const handleConfirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setIsDeletingQuestion(true);
    try {
      const res = await adminDeletePracticeQuestion(questionToDelete.id);
      if (res.success) {
        setQuestionToDelete(null);
        await loadQuestions();
        await loadOverview();
      } else {
        alert(res.error || 'Failed to delete question');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting question');
    } finally {
      setIsDeletingQuestion(false);
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
        {/* Top Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Practice &amp; Question Bank Console
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
              Manage FBISE chapter practice skills, author interactive MCQs, fill-in-the-blanks, and numerical exercises.
            </p>
          </div>

          {/* Primary Action Buttons (ALWAYS VISIBLE) */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setImportResult(null);
                setShowImportModal(true);
              }}
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1.5px solid #cbd5e1',
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>📁</span>
              <span>Bulk Import (JSON/CSV)</span>
            </button>

            <button
              type="button"
              onClick={openAddTopicModal}
              style={{
                background: '#047857',
                color: '#ffffff',
                border: '1px solid #065f46',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>+</span>
              <span>Add Practice Topic</span>
            </button>

            <button
              type="button"
              onClick={openAddQuestionModal}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: '1px solid #0369a1',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>+</span>
              <span>Add Question</span>
            </button>
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
                border: '1.5px solid #cbd5e1',
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
                border: '1.5px solid #cbd5e1',
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
                border: '1.5px solid #cbd5e1',
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

        {/* Two-Column Management Layout: Topics Sidebar + Questions Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Topics List Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}>
            {/* Topic Header with prominent + Add Topic button */}
            <div style={{
              padding: '1.125rem 1.25rem',
              borderBottom: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                  Unit Skills
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Topics ({activeChapter?.topics?.length || 0})
                </div>
              </div>

              <button
                type="button"
                onClick={openAddTopicModal}
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>+</span>
                <span>Add Topic</span>
              </button>
            </div>

            <div style={{ maxHeight: '620px', overflowY: 'auto' }}>
              {!activeChapter || !activeChapter.topics || activeChapter.topics.length === 0 ? (
                <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                    No topics created in this chapter yet.
                  </p>
                  <button
                    type="button"
                    onClick={openAddTopicModal}
                    style={{
                      background: '#047857',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    + Add First Topic
                  </button>
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
                          border: `1px solid ${tp.is_published ? '#a7f3d0' : '#fecaca'}`,
                        }}>
                          {tp.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                          {tp.question_count} Qs
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: isSelected ? '#064e3b' : '#1e293b', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                        {tp.title}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTopic({
                              ...tp,
                              chapter_id: activeChapter?.id || tp.chapter_id,
                            });
                            setTopicModalMode('edit');
                            setShowTopicModal(true);
                          }}
                          style={{
                            fontSize: '0.75rem',
                            color: '#047857',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTopicToDelete(tp);
                          }}
                          style={{
                            fontSize: '0.75rem',
                            color: '#be123c',
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          🗑️ Delete
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
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}>
            {/* Question Panel Header with prominent + Add Question button */}
            <div style={{
              padding: '1.125rem 1.5rem',
              borderBottom: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                  {activeTopic ? `Active Topic: ${activeTopic.title}` : 'Select a topic on the left'}
                </span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: '0.125rem 0 0 0' }}>
                  Questions ({questions.length})
                </h2>
              </div>

              <button
                type="button"
                onClick={openAddQuestionModal}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: '1px solid #0369a1',
                  padding: '0.5rem 1.125rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
                }}
              >
                <span>+</span>
                <span>Add Question</span>
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {questionsLoading ? (
                <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#0284c7',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 1rem auto',
                  }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Loading questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3.5rem 1.5rem',
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>❓</div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>
                    {activeTopic ? 'No questions in this topic yet' : 'No topic selected'}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 auto 1.5rem auto', maxWidth: '420px', lineHeight: 1.5 }}>
                    {activeTopic
                      ? `Get started by authoring the first MCQ, True/False, or numerical question for "${activeTopic.title}".`
                      : 'Choose a practice topic from the left panel or click below to create a new question directly.'}
                  </p>
                  <button
                    type="button"
                    onClick={openAddQuestionModal}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.625rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>+</span>
                    <span>Add Question to Topic</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        background: '#ffffff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#475569' }}>
                            Q{idx + 1}
                          </span>
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: '#f1f5f9',
                            color: '#1e293b',
                            border: '1px solid #cbd5e1',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '4px',
                          }}>
                            {q.question_type === 'mcq' && 'Multiple Choice'}
                            {q.question_type === 'true_false' && 'True / False'}
                            {q.question_type === 'fill_blank' && 'Fill in the Blank'}
                            {q.question_type === 'short_answer' && 'Short Answer'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            • {q.points} pts
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
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
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuestionToDelete(q)}
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
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
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
                                borderRadius: '8px',
                                background: opt.is_correct ? '#ecfdf5' : '#f8fafc',
                                border: `1.5px solid ${opt.is_correct ? '#10b981' : '#e2e8f0'}`,
                                color: opt.is_correct ? '#065f46' : '#475569',
                                fontWeight: opt.is_correct ? 700 : 400,
                              }}
                            >
                              {opt.is_correct ? '✓ ' : '• '} {opt.option_text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Accepted answers for short answer */}
                      {q.accepted_answers && q.accepted_answers.length > 0 && (
                        <div style={{
                          fontSize: '0.8125rem',
                          color: '#047857',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          marginBottom: '0.75rem',
                        }}>
                          <strong>Accepted Answer Variants:</strong> {q.accepted_answers.map((a: any) => a.accepted_text).join(' | ')}
                        </div>
                      )}

                      {q.explanation && (
                        <div style={{
                          fontSize: '0.8125rem',
                          background: '#f8fafc',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          lineHeight: 1.5,
                        }}>
                          <strong style={{ color: '#047857' }}>Explanation: </strong> {q.explanation}
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
      {/* Topic Create / Edit Modal */}
      {/* ---------------------------------------------------------------------- */}
      {showTopicModal && currentTopic && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1.5px solid #cbd5e1',
            maxWidth: '540px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {topicModalMode === 'create' ? 'Add Practice Topic' : 'Edit Practice Topic'}
              </h2>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (topicModalMode === 'create') {
                  const res = await adminCreatePracticeTopic({
                    chapter_id: Number(currentTopic.chapter_id),
                    title: currentTopic.title,
                    description: currentTopic.description,
                    difficulty: currentTopic.difficulty,
                    order: Number(currentTopic.order || 1),
                    is_published: currentTopic.is_published,
                  });
                  if (res.success) {
                    setShowTopicModal(false);
                    await loadOverview();
                    if (res.id) setSelectedTopicId(res.id);
                  } else {
                    alert(res.error || 'Failed to create topic');
                  }
                } else {
                  const res = await adminUpdatePracticeTopic(currentTopic.id, {
                    title: currentTopic.title,
                    description: currentTopic.description,
                    difficulty: currentTopic.difficulty,
                    order: Number(currentTopic.order || 1),
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
              {/* Chapter Selector Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Target Chapter / Unit *
                </label>
                <select
                  required
                  value={currentTopic.chapter_id || ''}
                  onChange={(e) => setCurrentTopic({ ...currentTopic, chapter_id: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600 }}
                >
                  {allChaptersList.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Topic / Skill Title *
                </label>
                <input
                  type="text"
                  required
                  value={currentTopic.title || ''}
                  onChange={(e) => setCurrentTopic({ ...currentTopic, title: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  placeholder="e.g. Calculating Centripetal Acceleration"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Description / SLO Learning Outcome
                </label>
                <textarea
                  rows={2}
                  value={currentTopic.description || ''}
                  onChange={(e) => setCurrentTopic({ ...currentTopic, description: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  placeholder="Summary of skills tested and board alignment..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Difficulty Level
                  </label>
                  <select
                    value={currentTopic.difficulty || 'intermediate'}
                    onChange={(e) => setCurrentTopic({ ...currentTopic, difficulty: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Sequence / Order
                  </label>
                  <input
                    type="number"
                    value={currentTopic.order || 1}
                    onChange={(e) => setCurrentTopic({ ...currentTopic, order: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
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
                <label htmlFor="topic_published" style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                  Publish topic immediately for student practice
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
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
                    padding: '0.625rem 1.35rem',
                    background: '#047857',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Practice Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Question Create / Edit Modal */}
      {/* ---------------------------------------------------------------------- */}
      {showQuestionModal && currentQuestion && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1.5px solid #cbd5e1',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✍️</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {questionModalMode === 'create' ? 'Add Practice Question' : 'Edit Practice Question'}
              </h2>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (questionModalMode === 'create') {
                  const res = await adminCreatePracticeQuestion({
                    topic_id: Number(currentQuestion.topic_id),
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
              {/* Target Topic Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Target Practice Skill / Topic *
                </label>
                <select
                  required
                  value={currentQuestion.topic_id || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, topic_id: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600 }}
                >
                  {allTopicsList.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
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
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600 }}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="true_false">True / False</option>
                    <option value="fill_blank">Fill in the Blank</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    SmartScore Points
                  </label>
                  <input
                    type="number"
                    value={currentQuestion.points || 10}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Question Prompt / Problem Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  value={currentQuestion.prompt || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, prompt: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  placeholder="Enter the problem statement or question text..."
                />
              </div>

              {/* Options Table for MCQ / True False */}
              {(currentQuestion.question_type === 'mcq' || currentQuestion.question_type === 'true_false') && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
                      Option Choices (Select the radio for the correct answer)
                    </label>
                    {currentQuestion.question_type === 'mcq' && (
                      <button
                        type="button"
                        onClick={() => {
                          const opts = [...(currentQuestion.options || [])];
                          opts.push({ option_text: '', is_correct: false, order: opts.length + 1 });
                          setCurrentQuestion({ ...currentQuestion, options: opts });
                        }}
                        style={{ fontSize: '0.75rem', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        + Add Choice
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
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
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
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
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: opt.is_correct ? '2px solid #10b981' : '1px solid #cbd5e1',
                            background: opt.is_correct ? '#ecfdf5' : '#ffffff',
                          }}
                        />
                        {currentQuestion.question_type === 'mcq' && currentQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const opts = currentQuestion.options.filter((_: any, i: number) => i !== idx);
                              setCurrentQuestion({ ...currentQuestion, options: opts });
                            }}
                            style={{ color: '#be123c', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
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
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
                      Accepted Answer Variants (Normalized &amp; Case-Insensitive)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const acc = [...(currentQuestion.accepted_answers || [])];
                        acc.push({ accepted_text: '', is_case_sensitive: false });
                        setCurrentQuestion({ ...currentQuestion, accepted_answers: acc });
                      }}
                      style={{ fontSize: '0.75rem', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
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
                          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                        />
                        {currentQuestion.accepted_answers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const list = currentQuestion.accepted_answers.filter((_: any, i: number) => i !== idx);
                              setCurrentQuestion({ ...currentQuestion, accepted_answers: list });
                            }}
                            style={{ color: '#be123c', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
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
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Curriculum Explanation * (Shown strictly after student submits answer)
                </label>
                <textarea
                  rows={3}
                  required
                  value={currentQuestion.explanation || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  placeholder="Explain why this answer is correct according to FBISE standards..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
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
                    padding: '0.625rem 1.35rem',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
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
      {/* Custom Bordered Modal: Delete Topic Confirmation */}
      {/* ---------------------------------------------------------------------- */}
      {topicToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1.5px solid #fecaca',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '500px',
            width: '100%',
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1.5px solid #fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                  Delete Practice Topic?
                </h3>
                <span style={{ fontSize: '0.8125rem', color: '#991b1b', fontWeight: 600 }}>
                  This will also delete all associated questions
                </span>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #ef4444',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {topicToDelete.title}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                Contains {topicToDelete.question_count || 0} questions
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setTopicToDelete(null)}
                disabled={isDeletingTopic}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTopic}
                disabled={isDeletingTopic}
                style={{
                  padding: '0.625rem 1.35rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isDeletingTopic ? 'wait' : 'pointer',
                }}
              >
                {isDeletingTopic ? 'Deleting...' : 'Confirm Delete Topic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Custom Bordered Modal: Delete Question Confirmation */}
      {/* ---------------------------------------------------------------------- */}
      {questionToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1.5px solid #fecaca',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '500px',
            width: '100%',
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1.5px solid #fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}>
                🗑️
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                  Delete Practice Question?
                </h3>
                <span style={{ fontSize: '0.8125rem', color: '#991b1b', fontWeight: 600 }}>
                  Permanent Removal from Question Bank
                </span>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #ef4444',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}>
              <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.5 }}>
                {questionToDelete.prompt}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                disabled={isDeletingQuestion}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuestion}
                disabled={isDeletingQuestion}
                style={{
                  padding: '0.625rem 1.35rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isDeletingQuestion ? 'wait' : 'pointer',
                }}
              >
                {isDeletingQuestion ? 'Deleting...' : 'Confirm Delete Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Bulk Import Modal */}
      {/* ---------------------------------------------------------------------- */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1.5px solid #cbd5e1',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Bulk Import Questions
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Paste a JSON array of questions with <code>topic_id</code> or <code>topic_slug</code> to populate in batch.
            </p>

            {importResult && (
              <div style={{
                padding: '0.75rem 1rem',
                background: '#ecfdf5',
                color: '#065f46',
                borderRadius: '8px',
                border: '1px solid #a7f3d0',
                marginBottom: '1rem',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                ✓ {importResult}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
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
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8125rem', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
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
                  padding: '0.625rem 1.35rem',
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
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
