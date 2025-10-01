'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Eye, 
  CheckCircle, 
  Clock, 
  FileText, 
  Calendar,
  Users,
  Settings,
  Type,
  Hash,
  ToggleLeft,
  List,
  Upload
} from 'lucide-react';
import { QuestionSet, Question, Service, fetchAllServices, fetchQuestionSet } from '@/lib/api';

interface QuestionSetPreviewProps {
  questionSet: QuestionSet;
  onBack: () => void;
  onEdit: () => void;
}

export default function QuestionSetPreview({ questionSet, onBack, onEdit }: QuestionSetPreviewProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [fullQuestionSet, setFullQuestionSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [questionSet.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesData, questionSetData] = await Promise.all([
        fetchAllServices(),
        fetchQuestionSet(questionSet.id)
      ]);
      setServices(servicesData);
      setFullQuestionSet(questionSetData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const getQuestionTypeIcon = (type: string) => {
    const icons = {
      text: Type,
      number: Hash,
      boolean: ToggleLeft,
      select: List,
      multi_select: List,
      date: Calendar,
      file: Upload,
    };
    return icons[type as keyof typeof icons] || Type;
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels = {
      text: 'Text Input',
      number: 'Number Input',
      boolean: 'Yes/No',
      select: 'Single Choice',
      multi_select: 'Multiple Choice',
      date: 'Date Picker',
      file: 'File Upload',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const renderQuestion = (question: Question) => {
    const Icon = getQuestionTypeIcon(question.question_type);
    
    return (
      <div key={question.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-600" />
          <label className="text-sm font-medium text-gray-900">
            {question.label}
            {question.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        
        {question.description && (
          <p className="text-sm text-gray-600">{question.description}</p>
        )}

        <div className="text-xs text-gray-500 mb-2">
          Type: {getQuestionTypeLabel(question.question_type)} | Key: {question.key}
        </div>

        {renderQuestionInput(question)}
      </div>
    );
  };

  const renderQuestionInput = (question: Question) => {
    const value = formData[question.key] || '';

    switch (question.question_type) {
      case 'text':
        return (
          <Input
            placeholder="Enter your answer..."
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [question.key]: e.target.value }))}
            minLength={question.min_length}
            maxLength={question.max_length}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            placeholder="Enter a number..."
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [question.key]: e.target.value }))}
            min={question.min_value}
            max={question.max_value}
          />
        );
      
      case 'boolean':
        return (
          <div className="question-option-container">
            <div className="question-option-item">
              <input
                type="radio"
                name={question.key}
                checked={value === true}
                onChange={() => setFormData(prev => ({ ...prev, [question.key]: true }))}
                className="question-option-input"
                id={`${question.key}-yes`}
              />
              <label htmlFor={`${question.key}-yes`} className="question-option-label">
                Yes
              </label>
            </div>
            <div className="question-option-item">
              <input
                type="radio"
                name={question.key}
                checked={value === false}
                onChange={() => setFormData(prev => ({ ...prev, [question.key]: false }))}
                className="question-option-input"
                id={`${question.key}-no`}
              />
              <label htmlFor={`${question.key}-no`} className="question-option-label">
                No
              </label>
            </div>
          </div>
        );
      
      case 'select':
        return (
          <div className="question-option-container">
            {question.options?.choices?.map((choice: any, index: number) => {
              const choiceValue = typeof choice === 'string' ? choice : choice.value;
              const choiceLabel = typeof choice === 'string' ? choice : choice.label;
              const isLast = index === (question.options?.choices?.length || 0) - 1;
              return (
                <div key={index} className={`question-option-item ${isLast ? 'border-b-0' : ''}`}>
                  <input
                    type="radio"
                    name={question.key}
                    value={choiceValue}
                    checked={value === choiceValue}
                    onChange={() => setFormData(prev => ({ ...prev, [question.key]: choiceValue }))}
                    className="question-option-input"
                    id={`${question.key}-${index}`}
                  />
                  <label htmlFor={`${question.key}-${index}`} className="question-option-label">
                    {choiceLabel}
                  </label>
                </div>
              );
            })}
          </div>
        );
      
      case 'multi_select':
        return (
          <div className="question-option-container">
            {question.options?.choices?.map((choice: any, index: number) => {
              const choiceValue = typeof choice === 'string' ? choice : choice.value;
              const choiceLabel = typeof choice === 'string' ? choice : choice.label;
              const isLast = index === (question.options?.choices?.length || 0) - 1;
              return (
                <div key={index} className={`question-option-item ${isLast ? 'border-b-0' : ''}`}>
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(choiceValue)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, choiceValue]
                        : currentValues.filter((v: string) => v !== choiceValue);
                      setFormData(prev => ({ ...prev, [question.key]: newValues }));
                    }}
                    className="question-option-checkbox"
                    id={`${question.key}-${index}`}
                  />
                  <label htmlFor={`${question.key}-${index}`} className="question-option-label">
                    {choiceLabel}
                  </label>
                </div>
              );
            })}
          </div>
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [question.key]: e.target.value }))}
          />
        );
      
      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
            <input
              type="file"
              onChange={(e) => setFormData(prev => ({ ...prev, [question.key]: e.target.files?.[0] }))}
              accept={question.allowed_file_types?.join(',')}
              className="hidden"
              id={`file-${question.key}`}
            />
            <label
              htmlFor={`file-${question.key}`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
            >
              Choose File
            </label>
            {question.max_file_size && (
              <p className="text-xs text-gray-500 mt-2">
                Max size: {Math.round(question.max_file_size / 1024 / 1024)}MB
              </p>
            )}
          </div>
        );
      
      default:
        return <div className="text-gray-500 italic">Unsupported question type</div>;
    }
  };

  const questions = fullQuestionSet?.questions || [];
  const totalSteps = Math.ceil(questions.length / 3); // Show 3 questions per step

  const currentQuestions = questions.slice(currentStep * 3, (currentStep + 1) * 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading question set...</div>
      </div>
    );
  }

  if (!fullQuestionSet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Question set not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preview Question Set</h1>
            <p className="text-gray-600">See how customers will experience this form</p>
          </div>
        </div>
        <Button onClick={onEdit} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Set Info */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Set Info</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{fullQuestionSet.name}</h4>
                <p className="text-sm text-gray-600">{getServiceName(fullQuestionSet.service_id)}</p>
              </div>

              {fullQuestionSet.description && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Description</h5>
                  <p className="text-sm text-gray-600">{fullQuestionSet.description}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge 
                  variant={fullQuestionSet.status === 'published' ? 'default' : 'secondary'}
                  className={fullQuestionSet.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                >
                  {fullQuestionSet.status === 'published' ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Published</>
                  ) : (
                    <><Clock className="h-3 w-3 mr-1" /> Draft</>
                  )}
                </Badge>
                <Badge variant="outline">v{fullQuestionSet.version}</Badge>
              </div>

              <div className="flex items-center gap-1 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                {questions.length} questions
              </div>

              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Created {new Date(fullQuestionSet.created_at).toLocaleDateString()}
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Form Preview</h3>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Customer View</span>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h4>
                <p className="text-gray-600">Add questions to see the preview</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Progress indicator */}
                {totalSteps > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Step {currentStep + 1} of {totalSteps}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                        disabled={currentStep === totalSteps - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Questions */}
                <div className="space-y-6">
                  {currentQuestions.map(renderQuestion)}
                </div>

                {/* Form actions */}
                <div className="flex justify-end gap-2 pt-6 border-t">
                  <Button variant="outline" onClick={() => setFormData({})}>
                    Clear Form
                  </Button>
                  <Button onClick={() => alert('Form submitted! (This is just a preview)')}>
                    Submit Form
                  </Button>
                </div>

                {/* Debug info */}
                <details className="mt-6">
                  <summary className="text-sm text-gray-600 cursor-pointer">Debug: Form Data</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
