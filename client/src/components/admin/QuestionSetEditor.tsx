'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  Eye,
  GripVertical,
  Type,
  Hash,
  ToggleLeft,
  List,
  Calendar,
  Upload,
  Settings,
  AlertCircle
} from 'lucide-react';
import { 
  QuestionSet, 
  Question, 
  Service,
  QuestionCreate,
  QuestionUpdate,
  fetchAllServices,
  createQuestionSet,
  updateQuestionSet,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchQuestionSet
} from '@/lib/api';

interface QuestionSetEditorProps {
  questionSet?: QuestionSet;
  onBack: () => void;
  onPreview: (questionSet: QuestionSet) => void;
  onSave: (questionSet: QuestionSet) => void;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'boolean', label: 'Yes/No', icon: ToggleLeft },
  { value: 'select', label: 'Single Choice', icon: List },
  { value: 'multi_select', label: 'Multiple Choice', icon: List },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'file', label: 'File Upload', icon: Upload },
];

export default function QuestionSetEditor({ questionSet, onBack, onPreview, onSave }: QuestionSetEditorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState({
    service_id: '',
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'published',
    sort_order: 0
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  useEffect(() => {
    fetchServices();
    if (questionSet) {
      setFormData({
        service_id: questionSet.service_id,
        name: questionSet.name,
        description: questionSet.description || '',
        status: questionSet.status,
        sort_order: questionSet.sort_order
      });
      // Fetch the complete question set with questions
      fetchQuestionSetWithQuestions(questionSet.id);
    }
  }, [questionSet]);

  const fetchServices = async () => {
    try {
      const servicesData = await fetchAllServices();
      setServices(servicesData);
      if (!questionSet && servicesData.length > 0) {
        setFormData(prev => ({ ...prev, service_id: servicesData[0].id }));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchQuestionSetWithQuestions = async (questionSetId: string) => {
    try {
      setLoading(true);
      const completeQuestionSet = await fetchQuestionSet(questionSetId);
      setQuestions(completeQuestionSet.questions || []);
    } catch (error) {
      console.error('Error fetching question set with questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.service_id) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      let savedQuestionSet: QuestionSet;
      
      if (questionSet) {
        savedQuestionSet = await updateQuestionSet(questionSet.id, formData);
      } else {
        savedQuestionSet = await createQuestionSet(formData);
      }

      onSave(savedQuestionSet);
    } catch (error) {
      console.error('Error saving question set:', error);
      alert('Failed to save question set');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!questionSet) {
      alert('Please save the question set first before previewing');
      return;
    }

    try {
      // Fetch the complete question set data with questions
      const completeQuestionSet = await fetchQuestionSet(questionSet.id);
      onPreview(completeQuestionSet);
    } catch (error) {
      console.error('Error fetching question set for preview:', error);
      alert('Failed to load question set for preview');
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionForm(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async (questionData: Partial<Question>) => {
    if (!questionSet) {
      alert('Please save the question set first');
      return;
    }

    try {
      if (editingQuestion) {
        const updatedQuestion = await updateQuestion(editingQuestion.id, questionData);
        setQuestions(questions.map(q => q.id === editingQuestion.id ? updatedQuestion : q));
      } else {
        const newQuestion = await createQuestion({
          question_set_id: questionSet.id,
          ...questionData
        } as QuestionCreate);
        setQuestions([...questions, newQuestion]);
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestion(questionId);
        setQuestions(questions.filter(q => q.id !== questionId));
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question');
      }
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    const questionType = QUESTION_TYPES.find(t => t.value === type);
    return questionType ? questionType.icon : Type;
  };

  const getQuestionTypeLabel = (type: string) => {
    const questionType = QUESTION_TYPES.find(t => t.value === type);
    return questionType ? questionType.label : type;
  };

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
            <h1 className="text-2xl font-bold text-gray-900">
              {questionSet ? 'Edit Question Set' : 'Create Question Set'}
            </h1>
            <p className="text-gray-600">
              {questionSet ? 'Modify your question set' : 'Create a new question set for a service'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {questionSet && (
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Set Details */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Set Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service *
                </label>
                <select
                  value={formData.service_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter question set name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Questions */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
              <Button onClick={handleAddQuestion} size="sm" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading questions...</div>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h4>
                <p className="text-gray-600 mb-4">Add questions to collect information from customers</p>
                <Button onClick={handleAddQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => {
                  const Icon = getQuestionTypeIcon(question.question_type);
                  return (
                    <div key={question.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {question.label}
                          </span>
                          {question.is_required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getQuestionTypeLabel(question.question_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Key: {question.key}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Question Form Modal */}
      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setShowQuestionForm(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
}

// Question Form Component
interface QuestionFormProps {
  question?: Question | null;
  onSave: (questionData: Partial<Question>) => void;
  onCancel: () => void;
}

function QuestionForm({ question, onSave, onCancel }: QuestionFormProps) {
  const [formData, setFormData] = useState({
    key: '',
    label: '',
    description: '',
    question_type: 'text' as Question['question_type'],
    is_required: false,
    sort_order: 0,
    options: {} as Record<string, any>,
    min_value: undefined as number | undefined,
    max_value: undefined as number | undefined,
    min_length: undefined as number | undefined,
    max_length: undefined as number | undefined,
    allowed_file_types: [] as string[],
    max_file_size: undefined as number | undefined,
  });

  useEffect(() => {
    if (question) {
      setFormData({
        key: question.key,
        label: question.label,
        description: question.description || '',
        question_type: question.question_type,
        is_required: question.is_required,
        sort_order: question.sort_order,
        options: question.options || {},
        min_value: question.min_value,
        max_value: question.max_value,
        min_length: question.min_length,
        max_length: question.max_length,
        allowed_file_types: question.allowed_file_types || [],
        max_file_size: question.max_file_size,
      });
    }
  }, [question]);

  const handleSave = () => {
    if (!formData.key.trim() || !formData.label.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const questionData = { ...formData };
    
    // Clean up undefined values
    Object.keys(questionData).forEach(key => {
      if (questionData[key as keyof typeof questionData] === undefined) {
        delete questionData[key as keyof typeof questionData];
      }
    });

    onSave(questionData);
  };

  const renderTypeSpecificFields = () => {
    switch (formData.question_type) {
      case 'select':
      case 'multi_select':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Answer Options
            </label>
            
            {/* Choice Options */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options ({formData.options?.choices?.length || 0} added)
                </label>
                <div className="space-y-2">
                  {(formData.options?.choices || []).map((choice: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={choice}
                        onChange={(e) => {
                          const newChoices = [...(formData.options?.choices || [])];
                          newChoices[index] = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            options: { ...prev.options, choices: newChoices }
                          }));
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newChoices = (formData.options?.choices || []).filter((_: string, i: number) => i !== index);
                          setFormData(prev => ({
                            ...prev,
                            options: { ...prev.options, choices: newChoices }
                          }));
                        }}
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newChoices = [...(formData.options?.choices || []), ''];
                      setFormData(prev => ({
                        ...prev,
                        options: { ...prev.options, choices: newChoices }
                      }));
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>

              {/* Multiple Choice Constraints */}
              {formData.question_type === 'multi_select' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Selections
                    </label>
                    <Input
                      type="number"
                      value={formData.options?.min_selections || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        options: {
                          ...prev.options,
                          min_selections: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                      placeholder="No minimum"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Selections
                    </label>
                    <Input
                      type="number"
                      value={formData.options?.max_selections || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        options: {
                          ...prev.options,
                          max_selections: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                      placeholder="No maximum"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {/* Allow Other Option */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Allow "Other" option
                  </label>
                  <p className="text-xs text-gray-500">
                    Let users enter a custom answer
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.options?.allow_other || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      allow_other: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {/* Other Label */}
              {formData.options?.allow_other && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    "Other" Option Label
                  </label>
                  <Input
                    value={formData.options?.other_label || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      options: {
                        ...prev.options,
                        other_label: e.target.value
                      }
                    }))}
                    placeholder="Other (please specify)"
                  />
                </div>
              )}
            </div>

            {/* Quick Templates */}
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</h5>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    options: { 
                      ...prev.options,
                      choices: ["Yes", "No"],
                      allow_other: false
                    }
                  }))}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  Yes/No
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    options: { 
                      ...prev.options,
                      choices: ["Small", "Medium", "Large"],
                      allow_other: false
                    }
                  }))}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  Small/Medium/Large
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    options: { 
                      ...prev.options,
                      choices: ["Option 1", "Option 2", "Option 3"],
                      allow_other: true,
                      other_label: "Other (please specify)"
                    }
                  }))}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  With "Other"
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    options: { 
                      ...prev.options,
                      choices: ["Excellent", "Good", "Fair", "Poor"],
                      allow_other: false
                    }
                  }))}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  Rating Scale
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'number':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Value
              </label>
              <Input
                type="number"
                value={formData.min_value || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  min_value: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="No minimum"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Value
              </label>
              <Input
                type="number"
                value={formData.max_value || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_value: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="No maximum"
              />
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Length
              </label>
              <Input
                type="number"
                value={formData.min_length || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  min_length: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="No minimum"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Length
              </label>
              <Input
                type="number"
                value={formData.max_length || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_length: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="No maximum"
              />
            </div>
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed File Types
              </label>
              <Input
                value={formData.allowed_file_types.join(', ')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  allowed_file_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
                placeholder="jpg, png, pdf, doc"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max File Size (bytes)
              </label>
              <Input
                type="number"
                value={formData.max_file_size || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_file_size: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="10485760 (10MB)"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {question ? 'Edit Question' : 'Add Question'}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key *
              </label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                placeholder="question_key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label *
            </label>
            <Input
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="What is your question?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional help text"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Type
            </label>
            <select
              value={formData.question_type}
              onChange={(e) => setFormData(prev => ({ ...prev, question_type: e.target.value as Question['question_type'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {QUESTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_required"
              checked={formData.is_required}
              onChange={(e) => setFormData(prev => ({ ...prev, is_required: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_required" className="ml-2 block text-sm text-gray-700">
              Required question
            </label>
          </div>

          {renderTypeSpecificFields()}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {question ? 'Update Question' : 'Add Question'}
          </Button>
        </div>
      </div>
    </div>
  );
}
