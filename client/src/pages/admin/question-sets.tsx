'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import QuestionSetsList from '@/components/admin/QuestionSetsList';
import QuestionSetEditor from '@/components/admin/QuestionSetEditor';
import QuestionSetPreview from '@/components/admin/QuestionSetPreview';
import { QuestionSet } from '@/lib/api';

type ViewMode = 'list' | 'create' | 'edit' | 'preview';

export default function QuestionSetsAdmin() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSet | null>(null);

  const handleCreate = () => {
    setSelectedQuestionSet(null);
    setViewMode('create');
  };

  const handleEdit = (questionSet: QuestionSet) => {
    setSelectedQuestionSet(questionSet);
    setViewMode('edit');
  };

  const handlePreview = (questionSet: QuestionSet) => {
    setSelectedQuestionSet(questionSet);
    setViewMode('preview');
  };

  const handleBackToList = () => {
    setSelectedQuestionSet(null);
    setViewMode('list');
  };

  const handleSave = (questionSet: QuestionSet) => {
    setSelectedQuestionSet(questionSet);
    setViewMode('preview');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return (
          <QuestionSetsList
            onEdit={handleEdit}
            onPreview={handlePreview}
            onCreate={handleCreate}
          />
        );
      
      case 'create':
        return (
          <QuestionSetEditor
            onBack={handleBackToList}
            onPreview={handlePreview}
            onSave={handleSave}
          />
        );
      
      case 'edit':
        return (
          <QuestionSetEditor
            questionSet={selectedQuestionSet!}
            onBack={handleBackToList}
            onPreview={handlePreview}
            onSave={handleSave}
          />
        );
      
      case 'preview':
        return (
          <QuestionSetPreview
            questionSet={selectedQuestionSet!}
            onBack={handleBackToList}
            onEdit={() => setViewMode('edit')}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      {renderContent()}
    </AdminLayout>
  );
}

