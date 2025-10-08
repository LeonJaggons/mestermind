import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import CreateCategoryModal from '@/components/admin/CreateCategoryModal';
import CreateSubcategoryModal from '@/components/admin/CreateSubcategoryModal';
import EditSubcategoryModal from '@/components/admin/EditSubcategoryModal';
import EditCategoryModal from '@/components/admin/EditCategoryModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  ChevronRight,
  Settings,
  FolderOpen,
  MoreHorizontal
} from 'lucide-react';
import { Category, CategoryWithSubcategories, Subcategory, fetchAllCategoriesWithSubcategoriesAdmin } from '@/lib/api';

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<CategoryWithSubcategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateSubcategoryModal, setShowCreateSubcategoryModal] = useState(false);
  const [showEditSubcategoryModal, setShowEditSubcategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState<{id: string, name: string} | null>(null);
  const [selectedSubcategoryForEdit, setSelectedSubcategoryForEdit] = useState<Subcategory | null>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        console.log('Fetching categories...');
        const categoriesWithSubcategories = await fetchAllCategoriesWithSubcategoriesAdmin();
        console.log('Categories fetched:', categoriesWithSubcategories);
        setCategories(categoriesWithSubcategories);
        setFilteredCategories(categoriesWithSubcategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    let filtered = categories;

    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCategories(filtered);
  }, [categories, searchTerm]);

  const handleToggleCategoryStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus
        }),
      });

      if (response.ok) {
        setCategories(categories.map(category => 
          category.id === categoryId 
            ? { ...category, is_active: !currentStatus }
            : category
        ));
      }
    } catch (error) {
      console.error('Failed to update category status:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? This will also delete all subcategories and services.')) {
      try {
        const response = await fetch(`http://localhost:8000/categories/${categoryId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCategories(categories.filter(category => category.id !== categoryId));
        }
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handleCategoryCreated = async (newCategory: Category) => {
    // Refresh the categories list to include the new category
    try {
      const categoriesWithSubcategories = await fetchAllCategoriesWithSubcategoriesAdmin();
      setCategories(categoriesWithSubcategories);
      setFilteredCategories(categoriesWithSubcategories);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  };

  const handleAddSubcategory = (categoryId: string, categoryName: string) => {
    setSelectedCategoryForSubcategory({ id: categoryId, name: categoryName });
    setShowCreateSubcategoryModal(true);
  };

  const handleSubcategoryCreated = async (newSubcategory: Subcategory) => {
    // Refresh the categories list to include the new subcategory
    try {
      const categoriesWithSubcategories = await fetchAllCategoriesWithSubcategoriesAdmin();
      setCategories(categoriesWithSubcategories);
      setFilteredCategories(categoriesWithSubcategories);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  };

  const handleEditSubcategory = (subcategory: Subcategory, categoryName: string) => {
    setSelectedSubcategoryForEdit(subcategory);
    setSelectedCategoryForSubcategory({ id: subcategory.category_id, name: categoryName });
    setShowEditSubcategoryModal(true);
  };

  const handleSubcategoryUpdated = async (updatedSubcategory: Subcategory) => {
    // Refresh the categories list to include the updated subcategory
    try {
      const categoriesWithSubcategories = await fetchAllCategoriesWithSubcategoriesAdmin();
      setCategories(categoriesWithSubcategories);
      setFilteredCategories(categoriesWithSubcategories);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (confirm('Are you sure you want to delete this subcategory? This will also delete all associated services.')) {
      try {
        const response = await fetch(`http://localhost:8000/categories/subcategories/${subcategoryId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Refresh the categories list
          const categoriesWithSubcategories = await fetchAllCategoriesWithSubcategoriesAdmin();
          setCategories(categoriesWithSubcategories);
          setFilteredCategories(categoriesWithSubcategories);
        }
      } catch (error) {
        console.error('Failed to delete subcategory:', error);
      }
    }
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategoryForEdit(category);
    setShowEditCategoryModal(true);
  };

  const handleCategoryUpdated = async (updatedCategory: Category) => {
    // Refresh the categories list to include the updated category
    try {
      const categoriesWithSubcategories = await fetchAllCategoriesWithSubcategoriesAdmin();
      setCategories(categoriesWithSubcategories);
      setFilteredCategories(categoriesWithSubcategories);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories Management</h1>
            <p className="text-gray-600">Organize your service categories and subcategories</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
        </div>

        {/* Search */}
        <Card className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Categories List */}
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Settings className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>{category.subcategories?.length || 0} subcategories</span>
                        <span>Sort order: {category.sort_order}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleExpanded(category.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${
                        expandedCategory === category.id ? 'rotate-90' : ''
                      }`} />
                    </button>
                    <button
                      onClick={() => handleToggleCategoryStatus(category.id, category.is_active)}
                      className={`p-2 rounded ${
                        category.is_active 
                          ? 'text-red-600 hover:text-red-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                      title={category.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {category.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-2 text-gray-600 hover:text-gray-900"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {expandedCategory === category.id && category.subcategories && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-900">Subcategories</h4>
                      <Button 
                        size="sm" 
                        className="flex items-center space-x-1"
                        onClick={() => handleAddSubcategory(category.id, category.name)}
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Subcategory</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FolderOpen className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-900">
                                {subcategory.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button 
                                className="p-1 text-gray-400 hover:text-gray-600"
                                onClick={() => handleEditSubcategory(subcategory, category.name)}
                                title="Edit subcategory"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button 
                                className="p-1 text-red-400 hover:text-red-600"
                                onClick={() => handleDeleteSubcategory(subcategory.id)}
                                title="Delete subcategory"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {subcategory.description && (
                            <p className="text-xs text-gray-600 mt-1">{subcategory.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              subcategory.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {subcategory.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Order: {subcategory.sort_order}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first category</p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Category
              </Button>
            </div>
          </Card>
        )}

        {/* Create Category Modal */}
        <CreateCategoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCategoryCreated={handleCategoryCreated}
        />

        {/* Create Subcategory Modal */}
        <CreateSubcategoryModal
          isOpen={showCreateSubcategoryModal}
          onClose={() => {
            setShowCreateSubcategoryModal(false);
            setSelectedCategoryForSubcategory(null);
          }}
          onSubcategoryCreated={handleSubcategoryCreated}
          categoryId={selectedCategoryForSubcategory?.id || ''}
          categoryName={selectedCategoryForSubcategory?.name || ''}
        />

        {/* Edit Subcategory Modal */}
        <EditSubcategoryModal
          isOpen={showEditSubcategoryModal}
          onClose={() => {
            setShowEditSubcategoryModal(false);
            setSelectedSubcategoryForEdit(null);
            setSelectedCategoryForSubcategory(null);
          }}
          onSubcategoryUpdated={handleSubcategoryUpdated}
          subcategory={selectedSubcategoryForEdit}
          categoryName={selectedCategoryForSubcategory?.name || ''}
        />

        {/* Edit Category Modal */}
        <EditCategoryModal
          isOpen={showEditCategoryModal}
          onClose={() => {
            setShowEditCategoryModal(false);
            setSelectedCategoryForEdit(null);
          }}
          onCategoryUpdated={handleCategoryUpdated}
          category={selectedCategoryForEdit}
        />
      </div>
    </AdminLayout>
  );
}
