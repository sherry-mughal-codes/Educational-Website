'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  startPracticeSession,
  submitPracticeAnswer,
  finishPracticeSession,
  getOrCreateGuestId,
  PracticeSessionState,
  QuestionItem,
  QuestionSubmitResult,
  PracticeSessionRecap,
} from '@/lib/api';

export default function InteractivePracticePage() {
  const params = useParams();
  const router = useRouter();
  const topicSlug = params.topicSlug as string;

  // Session state
  const [session, setSession] = useState<PracticeSessionState | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current question interaction state
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [activeFeedback, setActiveFeedback] = useState<QuestionSubmitResult | null>(null);

  // Session summary recap state
  const [recap, setRecap] = useState<PracticeSessionRecap | null>(null);

  // Initialize session
  const initSession = useCallback(async (forceNew = false, retryIds: number[] = []) => {
    setLoading(true);
    setErrorMessage(null);
    setActiveFeedback(null);
    setRecap(null);
    setSelectedOptionId(null);
    setTextAnswer('');

    try {
      const guestId = getOrCreateGuestId();
      const data = await startPracticeSession(topicSlug, {
        guest_identifier: guestId,
        force_new: forceNew,
        retry_question_ids: retryIds.length > 0 ? retryIds : undefined,
      });

      if (!data) {
        setErrorMessage('Unable to load practice topic. Please check the URL or try again.');
        setLoading(false);
        return;
      }

      setSession(data);

      // Find first unanswered question
      const firstUnansweredIndex = data.questions.findIndex((q) => !q.is_answered);
      if (firstUnansweredIndex >= 0) {
        setCurrentIndex(firstUnansweredIndex);
      } else if (data.questions.length > 0) {
        // All already answered
        setCurrentIndex(0);
        const lastQ = data.questions[0];
        if (lastQ.attempt) {
          setActiveFeedback({
            success: true,
            is_correct: lastQ.attempt.is_correct,
            points_awarded: lastQ.attempt.points_awarded,
            explanation: lastQ.attempt.explanation,
            correct_answer_display: lastQ.attempt.correct_answer_display,
            session_summary: {
              session_uuid: data.session_uuid,
              correct_answers: data.correct_answers,
              total_answered: data.answered_count,
              total_questions: data.total_questions,
              score: data.score,
              accuracy_percentage: data.accuracy_percentage,
              is_all_completed: data.answered_count >= data.total_questions,
            },
          });
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred loading the practice session.');
    } finally {
      setLoading(false);
    }
  }, [topicSlug]);

  useEffect(() => {
    if (topicSlug) {
      initSession();
    }
  }, [topicSlug, initSession]);

  const currentQuestion: QuestionItem | undefined = session?.questions[currentIndex];

  // Set local state when moving to an answered question
  useEffect(() => {
    if (currentQuestion) {
      if (currentQuestion.attempt) {
        setSelectedOptionId(currentQuestion.attempt.selected_option_id || null);
        setTextAnswer(currentQuestion.attempt.text_answer || '');
        setActiveFeedback({
          success: true,
          is_correct: currentQuestion.attempt.is_correct,
          points_awarded: currentQuestion.attempt.points_awarded,
          explanation: currentQuestion.attempt.explanation,
          correct_answer_display: currentQuestion.attempt.correct_answer_display,
          session_summary: {
            session_uuid: session!.session_uuid,
            correct_answers: session!.correct_answers,
            total_answered: session!.answered_count,
            total_questions: session!.total_questions,
            score: session!.score,
            accuracy_percentage: session!.accuracy_percentage,
            is_all_completed: session!.answered_count >= session!.total_questions,
          },
        });
      } else {
        setSelectedOptionId(null);
        setTextAnswer('');
        setActiveFeedback(null);
      }
    }
  }, [currentIndex, currentQuestion, session]);

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (!session || !currentQuestion || submitting) return;

    // Validate inputs
    if (currentQuestion.question_type in { mcq: 1, true_false: 1 } && !selectedOptionId) {
      return;
    }
    if (currentQuestion.question_type in { fill_blank: 1, short_answer: 1 } && !textAnswer.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitPracticeAnswer(currentQuestion.id, {
        session_uuid: session.session_uuid,
        selected_option_id: selectedOptionId,
        text_answer: textAnswer.trim(),
      });

      if (!result.success && result.error) {
        alert(result.error);
        setSubmitting(false);
        return;
      }

      setActiveFeedback(result);

      // Update session state in memory
      setSession((prev) => {
        if (!prev) return null;
        const updatedQuestions = [...prev.questions];
        updatedQuestions[currentIndex] = {
          ...updatedQuestions[currentIndex],
          is_answered: true,
          attempt: {
            selected_option_id: selectedOptionId,
            text_answer: textAnswer.trim(),
            is_correct: result.is_correct,
            points_awarded: result.points_awarded,
            explanation: result.explanation,
            correct_answer_display: result.correct_answer_display,
          },
        };

        return {
          ...prev,
          score: result.session_summary.score,
          correct_answers: result.session_summary.correct_answers,
          answered_count: result.session_summary.total_answered,
          accuracy_percentage: result.session_summary.accuracy_percentage,
          questions: updatedQuestions,
        };
      });
    } catch (err: any) {
      alert(err.message || 'Error evaluating answer');
    } finally {
      setSubmitting(false);
    }
  };

  // Move to next question or complete session
  const handleNextOrFinish = async () => {
    if (!session) return;

    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finalize session
      setFinalizing(true);
      try {
        const recapData = await finishPracticeSession(session.session_uuid);
        if (recapData) {
          setRecap(recapData);
        }
      } catch (err: any) {
        alert(err.message || 'Error finalizing practice session');
      } finally {
        setFinalizing(false);
      }
    }
  };

  // Retry missed questions
  const handleRetryMissed = () => {
    if (recap && recap.incorrect_question_ids.length > 0) {
      initSession(true, recap.incorrect_question_ids);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '44px',
            height: '44px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#047857',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', margin: '0 0 0.25rem 0' }}>
            Preparing Practice Questions...
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Aligning with FBISE Student Learning Outcomes.
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !session) {
    return (
      <div className="container" style={{ maxWidth: '640px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #fee2e2',
          padding: '2.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.5rem 0' }}>
            Practice Topic Unavailable
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {errorMessage || 'Could not load practice session. Please return to the subject practice index.'}
          </p>
          <button
            onClick={() => router.back()}
            style={{
              background: '#047857',
              color: '#ffffff',
              fontWeight: 600,
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render Completion Recap View
  // ---------------------------------------------------------------------------
  if (recap) {
    const accuracy = Math.round(recap.accuracy_percentage);
    const isMastery = accuracy >= 80;

    return (
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '2.5rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isMastery ? '#ecfdf5' : '#eff6ff',
            border: `3px solid ${isMastery ? '#10b981' : '#3b82f6'}`,
            fontSize: '2.5rem',
            marginBottom: '1.25rem',
          }}>
            {isMastery ? '🏆' : '🎯'}
          </div>

          <div style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#047857',
            letterSpacing: '0.05em',
            marginBottom: '0.25rem',
          }}>
            Practice Session Completed
          </div>

          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            {isMastery ? 'Outstanding Work!' : 'Skill Practice Complete!'}
          </h1>

          <p style={{ fontSize: '1rem', color: '#475569', margin: '0 auto 2rem auto', maxWidth: '520px', lineHeight: 1.6 }}>
            You have completed all questions for <strong>{recap.topic.title}</strong> ({recap.topic.subject_name}, {recap.topic.class_name}).
          </p>

          {/* Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
            background: '#f8fafc',
            borderRadius: '14px',
            padding: '1.5rem',
            border: '1px solid #f1f5f9',
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Accuracy</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: isMastery ? '#047857' : '#0284c7' }}>
                {accuracy}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Correct Answers</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a' }}>
                {recap.correct_answers} / {recap.total_questions}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>SmartScore</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#047857' }}>
                {recap.score} pts
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            {recap.incorrect_question_ids.length > 0 && (
              <button
                onClick={handleRetryMissed}
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🔄</span>
                <span>Retry Missed Questions ({recap.incorrect_question_ids.length})</span>
              </button>
            )}

            <button
              onClick={() => initSession(true)}
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: '0.9375rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              Practice Again (Full Set)
            </button>

            <Link
              href={`/${recap.topic.class_slug}/${recap.topic.subject_slug}/practice/`}
              style={{
                background: '#047857',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9375rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.2)',
              }}
            >
              <span>Back to Chapter Skills</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Question Review Breakdown */}
          <div style={{ textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Detailed Question Review
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recap.attempts.map((att, i) => (
                <div
                  key={att.question_id}
                  style={{
                    background: att.is_correct ? '#f0fdf4' : '#fff1f2',
                    border: `1px solid ${att.is_correct ? '#bbf7d0' : '#fecdd3'}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                      Question {i + 1}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: att.is_correct ? '#047857' : '#be123c',
                    }}>
                      {att.is_correct ? `✓ Correct (+${att.points_awarded} pts)` : '✗ Incorrect (0 pts)'}
                    </span>
                  </div>

                  <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem', margin: '0 0 0.5rem 0' }}>
                    {att.prompt}
                  </p>

                  <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '0.5rem' }}>
                    Your answer: <strong style={{ color: att.is_correct ? '#047857' : '#be123c' }}>{att.student_answer || 'No answer'}</strong>
                    {!att.is_correct && (
                      <span style={{ marginLeft: '1rem', color: '#047857' }}>
                        Correct answer: <strong>{att.correct_answer}</strong>
                      </span>
                    )}
                  </div>

                  {att.explanation && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      color: '#334155',
                      border: '1px solid rgba(0,0,0,0.05)',
                      lineHeight: 1.5,
                    }}>
                      <strong>Explanation: </strong> {att.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render Active Question Practice Screen
  // ---------------------------------------------------------------------------
  const totalQuestions = session.questions.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Top Header / Progress Bar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        {/* Progress Fill Line */}
        <div style={{ width: '100%', height: '4px', background: '#e2e8f0' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: '#047857',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div className="container" style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          {/* Breadcrumb Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
              <Link
                href={`/${session.topic.class_slug}/${session.topic.subject_slug}/practice/`}
                style={{ color: '#047857', textDecoration: 'none', fontWeight: 600 }}
              >
                ← {session.topic.subject_name} Skills
              </Link>
              <span>•</span>
              <span>Ch {session.topic.chapter_number}</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              {session.topic.title}
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                Question
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {currentIndex + 1} <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>of {totalQuestions}</span>
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                SmartScore
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>
                {session.score} pts
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Practice Question Canvas */}
      <main className="container" style={{ maxWidth: '820px', margin: '2rem auto', padding: '0 1rem' }}>
        {currentQuestion && (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden',
          }}>
            {/* Question Header Card */}
            <div style={{ padding: '2rem 2rem 1.5rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                }}>
                  {currentQuestion.question_type === 'mcq' && 'Multiple Choice'}
                  {currentQuestion.question_type === 'true_false' && 'True / False'}
                  {currentQuestion.question_type === 'fill_blank' && 'Fill in the Blank'}
                  {currentQuestion.question_type === 'short_answer' && 'Short Answer'}
                </span>

                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Worth {currentQuestion.points} points
                </span>
              </div>

              {/* Question Text Prompt */}
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#0f172a',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {currentQuestion.prompt}
              </h2>
            </div>

            {/* Answer Input Controls */}
            <div style={{ padding: '0 2rem 2rem 2rem' }}>
              {/* MCQ & True/False Options */}
              {(currentQuestion.question_type === 'mcq' || currentQuestion.question_type === 'true_false') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id;
                    const letter = String.fromCharCode(65 + idx);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={Boolean(activeFeedback)}
                        onClick={() => setSelectedOptionId(opt.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '1rem 1.25rem',
                          background: isSelected ? '#ecfdf5' : '#ffffff',
                          border: `2px solid ${isSelected ? '#047857' : '#e2e8f0'}`,
                          borderRadius: '12px',
                          cursor: activeFeedback ? 'default' : 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          outline: 'none',
                        }}
                      >
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          background: isSelected ? '#047857' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#475569',
                          flexShrink: 0,
                        }}>
                          {letter}
                        </span>

                        <span style={{
                          fontSize: '1rem',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#064e3b' : '#1e293b',
                          flex: 1,
                        }}>
                          {opt.option_text}
                        </span>

                        {isSelected && (
                          <span style={{ color: '#047857', fontWeight: 800 }}>●</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill in Blank / Short Answer Input */}
              {(currentQuestion.question_type === 'fill_blank' || currentQuestion.question_type === 'short_answer') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '420px' }}>
                  <label htmlFor="text-answer-input" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                    Type your answer:
                  </label>
                  <input
                    id="text-answer-input"
                    type="text"
                    disabled={Boolean(activeFeedback)}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !activeFeedback && textAnswer.trim()) {
                        handleSubmitAnswer();
                      }
                    }}
                    placeholder="Enter answer (e.g. 10 m/s or Kelvin)"
                    style={{
                      padding: '0.875rem 1rem',
                      fontSize: '1rem',
                      borderRadius: '10px',
                      border: '2px solid #cbd5e1',
                      outline: 'none',
                      background: activeFeedback ? '#f8fafc' : '#ffffff',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Tip: Answers are case-insensitive and allow standard unit formats.
                  </div>
                </div>
              )}

              {/* Primary Submit Button (before answer evaluation) */}
              {!activeFeedback && (
                <div style={{ marginTop: '1.75rem' }}>
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={
                      submitting ||
                      (currentQuestion.question_type in { mcq: 1, true_false: 1 } && !selectedOptionId) ||
                      (currentQuestion.question_type in { fill_blank: 1, short_answer: 1 } && !textAnswer.trim())
                    }
                    style={{
                      background: '#047857',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '1rem',
                      padding: '0.875rem 2rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: submitting ? 'wait' : 'pointer',
                      opacity: submitting || (!selectedOptionId && !textAnswer.trim()) ? 0.6 : 1,
                      boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.2)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {submitting ? 'Checking Answer...' : 'Submit Answer'}
                  </button>
                </div>
              )}
            </div>

            {/* Post-Submission Instant Feedback & Educational Explanation */}
            {activeFeedback && (
              <div style={{
                borderTop: '1px solid #e2e8f0',
                background: activeFeedback.is_correct ? '#f0fdf4' : '#fff1f2',
                padding: '2rem',
              }}>
                {/* Result Headline Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: activeFeedback.is_correct ? '#10b981' : '#f43f5e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}>
                    {activeFeedback.is_correct ? '✓' : '✗'}
                  </div>

                  <div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: activeFeedback.is_correct ? '#065f46' : '#9f1239',
                      margin: 0,
                    }}>
                      {activeFeedback.is_correct
                        ? `Brilliant! Correct (+${activeFeedback.points_awarded} points)`
                        : 'Not quite. Let’s learn the solution!'}
                    </h3>

                    {!activeFeedback.is_correct && activeFeedback.correct_answer_display && (
                      <div style={{ fontSize: '0.875rem', color: '#881337', marginTop: '0.25rem' }}>
                        Correct answer: <strong>{activeFeedback.correct_answer_display}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Educational Explanation Box */}
                {activeFeedback.explanation && (
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    marginBottom: '1.5rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#047857',
                      marginBottom: '0.5rem',
                      letterSpacing: '0.05em',
                    }}>
                      <span>📖</span>
                      <span>FBISE Concept &amp; Explanation</span>
                    </div>

                    <p style={{
                      fontSize: '0.9375rem',
                      color: '#334155',
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                      {activeFeedback.explanation}
                    </p>
                  </div>
                )}

                {/* Next Question / Finish CTA */}
                <div>
                  <button
                    type="button"
                    onClick={handleNextOrFinish}
                    disabled={finalizing}
                    style={{
                      background: '#047857',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '1rem',
                      padding: '0.875rem 2.25rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: finalizing ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.25)',
                    }}
                  >
                    <span>
                      {currentIndex < totalQuestions - 1 ? 'Next Question' : 'Complete Practice'}
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
