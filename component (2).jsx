import React, { useState, useEffect } from 'react';

const AdminPanel = () => {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'camisas',
    images: [],
    uploadedImages: [],
    stock: 0,
    rating: 4.5,
    reviews: 0,
    tags: [],
    featured: false,
    reference: '',
    variants: {
      colors: [],
      sizes: []
    },
    briefingQuestions: []
  });

  // Carregar produtos do localStorage
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('products');
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts);
        setProducts(Array.isArray(parsedProducts) ? parsedProducts : []);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setProducts([]);
    }
  }, []);

  // Função para salvar no localStorage
  const saveToLocalStorage = (productsToSave) => {
    try {
      const dataToSave = JSON.stringify(productsToSave);
      localStorage.setItem('products', dataToSave);
      localStorage.setItem('siteProducts', dataToSave);
      console.log('✅ Produtos salvos no localStorage');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar no localStorage:', error);
      return false;
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category: 'camisas',
      images: [],
      uploadedImages: [],
      stock: 0,
      rating: 4.5,
      reviews: 0,
      tags: [],
      featured: false,
      reference: '',
      variants: {
        colors: [],
        sizes: []
      },
      briefingQuestions: []
    });
    setEditingProduct(null);
    setShowForm(false);
    setActiveTab('basic');
  };

  // Adicionar produto
  const addProduct = () => {
    try {
      console.log('📝 Iniciando adição/edição de produto...');
      
      // Validações básicas
      if (!formData.name || formData.name.trim().length < 3) {
        alert('❌ Nome do produto deve ter pelo menos 3 caracteres!');
        return;
      }

      if (!formData.price || formData.price.trim() === '') {
        alert('❌ Preço é obrigatório!');
        return;
      }

      // Processar preço
      const priceValue = formData.price.replace(/[^\d,]/g, '').replace(',', '.');
      const numericPrice = parseFloat(priceValue) || 0;

      if (numericPrice <= 0) {
        alert('❌ Preço deve ser maior que zero!');
        return;
      }

      // Combinar imagens com verificação segura
      const allImages = [
        ...(Array.isArray(formData.images) ? formData.images.filter(img => img && img.trim()) : []),
        ...(Array.isArray(formData.uploadedImages) ? formData.uploadedImages.filter(img => img && img.trim()) : [])
      ];

      // Formatação de dados com verificações de arrays
      const formattedData = {
        ...formData,
        name: formData.name.trim(),
        price: formData.price.startsWith('R$') ? formData.price : `R$ ${formData.price}`,
        numericPrice: numericPrice,
        images: allImages,
        uploadedImages: Array.isArray(formData.uploadedImages) ? formData.uploadedImages : [],
        briefingQuestions: Array.isArray(formData.briefingQuestions) ? formData.briefingQuestions.filter(q => q && q.trim() !== '') : [],
        description: (formData.description || '').trim(),
        category: formData.category || 'camisas',
        stock: Math.max(0, parseInt(formData.stock) || 0),
        rating: Math.min(5, Math.max(0, parseFloat(formData.rating) || 4.5)),
        reviews: Math.max(0, parseInt(formData.reviews) || 0),
        tags: Array.isArray(formData.tags) ? formData.tags.filter(tag => tag && tag.trim()) : [],
        featured: Boolean(formData.featured),
        reference: formData.reference || `REF-${Date.now()}`,
        variants: {
          colors: Array.isArray(formData.variants?.colors) ? formData.variants.colors.filter(color => color && color.trim()) : [],
          sizes: Array.isArray(formData.variants?.sizes) ? formData.variants.sizes.filter(size => size && size.trim()) : []
        },
        createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('📝 Dados formatados com sucesso:', formattedData);

      // Verificar duplicatas
      const duplicateName = products.find(p => 
        p.name.toLowerCase() === formattedData.name.toLowerCase() && 
        (!editingProduct || p.id !== editingProduct.id)
      );

      if (duplicateName) {
        const confirm = window.confirm(`⚠️ Já existe um produto com o nome "${formattedData.name}". Deseja continuar mesmo assim?`);
        if (!confirm) return;
      }

      let updatedProducts;
      if (editingProduct) {
        updatedProducts = products.map(p => 
          p.id === editingProduct.id ? { ...formattedData, id: editingProduct.id } : p
        );
      } else {
        const newProduct = { 
          ...formattedData, 
          id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
        };
        updatedProducts = [...(products || []), newProduct];
      }

      // Atualizar estado
      setProducts(updatedProducts);
      
      // Salvar no localStorage
      const saveSuccess = saveToLocalStorage(updatedProducts);
      
      if (saveSuccess) {
        // Disparar eventos de sincronização CORRIGIDOS
        setTimeout(() => {
          try {
            // Dispara evento para o próprio window (funciona entre componentes React e HTML)
            const storageEvent = new Event('storage');
            storageEvent.key = 'products';
            storageEvent.newValue = JSON.stringify(updatedProducts);
            storageEvent.storageArea = localStorage;
            window.dispatchEvent(storageEvent);
            
            // Também dispara para siteProducts
            const siteStorageEvent = new Event('storage');
            siteStorageEvent.key = 'siteProducts';
            siteStorageEvent.newValue = JSON.stringify(updatedProducts);
            siteStorageEvent.storageArea = localStorage;
            window.dispatchEvent(siteStorageEvent);
            
            // Evento customizado com dados
            window.dispatchEvent(new CustomEvent('productDataChanged', {
              detail: { products: updatedProducts, source: 'admin-panel' }
            }));
            
            // Força atualização do site através do parent window se existir
            if (window.parent && window.parent !== window) {
              try {
                window.parent.dispatchEvent(new CustomEvent('productDataChanged', {
                  detail: { products: updatedProducts, source: 'admin-panel' }
                }));
              } catch (crossOriginError) {
                console.log('Cross-origin limitation, usando postMessage...');
                window.parent.postMessage({
                  type: 'productDataChanged',
                  products: updatedProducts,
                  source: 'admin-panel'
                }, '*');
              }
            }
            
            console.log('🔄 Eventos de sincronização disparados corretamente');
          } catch (eventError) {
            console.warn('⚠️ Erro ao disparar evento de sincronização:', eventError);
          }
        }, 50);
      }
      
      const successMessage = `🎉 SUCESSO! 
      
Produto "${formattedData.name}" foi ${editingProduct ? 'atualizado' : 'cadastrado'} com sucesso!

✅ Dados salvos localmente
✅ Site atualizado automaticamente
✅ ${allImages.length} imagem(s) anexada(s)

O formulário será fechado em 3 segundos...`;

      alert(successMessage);
      
      setTimeout(() => {
        resetForm();
      }, 3000);
      
    } catch (error) {
      console.error('💥 ERRO ao salvar produto:', error);
      alert(`❌ ERRO INESPERADO! 

Detalhes: ${error.message || 'Erro desconhecido'}

Dados NÃO foram salvos. Tente novamente.`);
    }
  };

  // Editar produto
  const editProduct = (product) => {
    setFormData(product);
    setEditingProduct(product);
    setShowForm(true);
    setActiveTab('basic');
  };

  // Deletar produto
  const deleteProduct = (id) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      const updatedProducts = products.filter(p => p.id !== id);
      setProducts(updatedProducts);
      saveToLocalStorage(updatedProducts);
      
      // Disparar sincronização
      setTimeout(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'products',
          newValue: JSON.stringify(updatedProducts),
          url: window.location.href
        }));
      }, 100);
    }
  };

  // Atualizar site
  const updateSite = () => {
    try {
      const saveSuccess = saveToLocalStorage(products);
      
      if (saveSuccess) {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'products',
          newValue: JSON.stringify(products),
          url: window.location.href
        }));
        
        alert(`✅ Site atualizado com ${products.length} produtos!`);
      } else {
        alert('⚠️ Houve problemas na atualização. Tente novamente.');
      }
    } catch (error) {
      alert(`❌ ERRO ao atualizar site: ${error.message}`);
    }
  };

  // Adicionar tag
  const addTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
    }
  };

  // Remover tag
  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== index)
    }));
  };

  // Upload de imagem (simulado)
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          uploadedImages: [...(prev.uploadedImages || []), e.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏪 Painel Administrativo</h1>
              <p className="text-gray-600">Gerencie produtos da sua loja virtual</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  console.log('🧪 Testando sincronização...');
                  const testProduct = {
                    id: `test-${Date.now()}`,
                    name: `Produto Teste ${new Date().toLocaleTimeString()}`,
                    price: 'R$ 99,90',
                    category: 'camisas',
                    images: ['keys/teste?prompt=Produto%20de%20teste'],
                    stock: 10,
                    featured: true
                  };
                  
                  const testProducts = [...products, testProduct];
                  setProducts(testProducts);
                  
                  const success = saveToLocalStorage(testProducts);
                  if (success) {
                    setTimeout(() => {
                      window.dispatchEvent(new StorageEvent('storage', {
                        key: 'products',
                        newValue: JSON.stringify(testProducts),
                        url: window.location.href
                      }));
                      alert('🧪 Produto teste adicionado! Verifique o site.');
                    }, 100);
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-sm text-sm"
                title="Adicionar produto teste para verificar sincronização"
              >
                🧪 Teste Sync
              </button>
              <button
                onClick={updateSite}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                🔄 Atualizar Site
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                ➕ Novo Produto
              </button>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Status do Sistema</h3>
                <p className="text-blue-700 text-sm">
                  📦 {products.length} produto(s) cadastrado(s) • 
                  💾 Salvos localmente • 
                  🔄 Sincronização automática ativa
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Produtos */}
        {!showForm && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">📋 Produtos Cadastrados</h2>
            </div>
            
            <div className="p-6">
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto cadastrado</h3>
                  <p className="text-gray-500 mb-6">Comece adicionando seu primeiro produto</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    ➕ Adicionar Primeiro Produto
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <span className="text-gray-400 text-2xl">📷</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-green-600 font-medium">{product.price}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              {product.category} • Estoque: {product.stock}
                            </p>
                            {product.featured && (
                              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                                ⭐ Destaque
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editProduct(product)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded text-sm transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm transition-colors"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingProduct ? '✏️ Editar Produto' : '➕ Novo Produto'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'basic', label: '📝 Básico', icon: '📝' },
                  { id: 'images', label: '📸 Imagens', icon: '📸' },
                  { id: 'details', label: '🔍 Detalhes', icon: '🔍' },
                  { id: 'briefing', label: '📋 Briefing', icon: '📋' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Tab Básico */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📝 Nome do Produto *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Camisa Polo Masculina"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        💰 Preço *
                      </label>
                      <input
                        type="text"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: R$ 89,90"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏷️ Categoria
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="camisas">👔 Camisas</option>
                        <option value="calcas">👖 Calças</option>
                        <option value="vestidos">👗 Vestidos</option>
                        <option value="sapatos">👠 Sapatos</option>
                        <option value="acessorios">👜 Acessórios</option>
                        <option value="esportes">⚽ Esportes</option>
                        <option value="infantil">👶 Infantil</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📦 Estoque
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📄 Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descreva o produto..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={formData.featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
                      ⭐ Produto em destaque
                    </label>
                  </div>
                </div>
              )}

              {/* Tab Imagens */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🖼️ URLs de Imagens
                    </label>
                    <div className="space-y-2">
                      {(formData.images || []).map((image, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="url"
                            value={image}
                            onChange={(e) => {
                              const newImages = [...(formData.images || [])];
                              newImages[index] = e.target.value;
                              setFormData(prev => ({ ...prev, images: newImages }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://..."
                          />
                          <button
                            onClick={() => {
                              const newImages = (formData.images || []).filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, images: newImages }));
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, images: [...(prev.images || []), ''] }))}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded transition-colors"
                      >
                        ➕ Adicionar URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📤 Upload de Imagens
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {(formData.uploadedImages || []).length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(formData.uploadedImages || []).map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={image}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              onClick={() => {
                                const newImages = (formData.uploadedImages || []).filter((_, i) => i !== index);
                                setFormData(prev => ({ ...prev, uploadedImages: newImages }));
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Detalhes */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⭐ Avaliação (1-5)
                      </label>
                      <input
                        type="number"
                        value={formData.rating}
                        onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="5"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        💬 Número de Avaliações
                      </label>
                      <input
                        type="number"
                        value={formData.reviews}
                        onChange={(e) => setFormData(prev => ({ ...prev, reviews: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📦 Referência do Produto
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: REF-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🏷️ Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.tags || []).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nova tag..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addTag(e.target.value.trim());
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.target.previousElementSibling;
                          addTag(input.value.trim());
                          input.value = '';
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        ➕
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎨 Cores Disponíveis
                      </label>
                      <div className="space-y-2">
                        {(formData.variants?.colors || []).map((color, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={color}
                              onChange={(e) => {
                                const newColors = [...(formData.variants?.colors || [])];
                                newColors[index] = e.target.value;
                                setFormData(prev => ({ 
                                  ...prev, 
                                  variants: { ...prev.variants, colors: newColors }
                                }));
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ex: Azul"
                            />
                            <button
                              onClick={() => {
                                const newColors = (formData.variants?.colors || []).filter((_, i) => i !== index);
                                setFormData(prev => ({ 
                                  ...prev, 
                                  variants: { ...prev.variants, colors: newColors }
                                }));
                              }}
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            variants: { ...prev.variants, colors: [...(prev.variants?.colors || []), ''] }
                          }))}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded transition-colors"
                        >
                          ➕ Adicionar Cor
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📏 Tamanhos Disponíveis
                      </label>
                      <div className="space-y-2">
                        {(formData.variants?.sizes || []).map((size, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={size}
                              onChange={(e) => {
                                const newSizes = [...(formData.variants?.sizes || [])];
                                newSizes[index] = e.target.value;
                                setFormData(prev => ({ 
                                  ...prev, 
                                  variants: { ...prev.variants, sizes: newSizes }
                                }));
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ex: M"
                            />
                            <button
                              onClick={() => {
                                const newSizes = (formData.variants?.sizes || []).filter((_, i) => i !== index);
                                setFormData(prev => ({ 
                                  ...prev, 
                                  variants: { ...prev.variants, sizes: newSizes }
                                }));
                              }}
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            variants: { ...prev.variants, sizes: [...(prev.variants?.sizes || []), ''] }
                          }))}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded transition-colors"
                        >
                          ➕ Adicionar Tamanho
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Briefing */}
              {activeTab === 'briefing' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ❓ Perguntas do Briefing
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Adicione perguntas que o cliente deve responder ao personalizar o produto
                    </p>
                    
                    <div className="space-y-3">
                      {(formData.briefingQuestions || []).map((question, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={question}
                            onChange={(e) => {
                              const newQuestions = [...(formData.briefingQuestions || [])];
                              newQuestions[index] = e.target.value;
                              setFormData(prev => ({ ...prev, briefingQuestions: newQuestions }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Qual texto deseja na estampa?"
                          />
                          <button
                            onClick={() => {
                              const newQuestions = (formData.briefingQuestions || []).filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, briefingQuestions: newQuestions }));
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          briefingQuestions: [...(prev.briefingQuestions || []), ''] 
                        }))}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded transition-colors"
                      >
                        ➕ Adicionar Pergunta
                      </button>
                    </div>

                    {(formData.briefingQuestions || []).length > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">📋 Preview do Briefing:</h4>
                        <ul className="space-y-1">
                          {(formData.briefingQuestions || []).filter(q => q && q.trim()).map((question, index) => (
                            <li key={index} className="text-sm text-gray-700">
                              {index + 1}. {question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={addProduct}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {editingProduct ? '✏️ Atualizar Produto' : '💾 Salvar Produto'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;