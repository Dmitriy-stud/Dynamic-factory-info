document.addEventListener('DOMContentLoaded', function() {
    // ========== ОБРАБОТКА СОЗДАНИЯ УЧАСТКА ==========
    const createForm = document.getElementById('createSectionForm');
    const sectionNameInput = document.getElementById('sectionName');
    const sectionNameError = document.getElementById('sectionNameError');
    const factorySelect = document.getElementById('factory_id');
    const factoryError = document.getElementById('factoryError');
    
    if (createForm) {
        createForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = sectionNameInput.value.trim();
            const factoryId = factorySelect.value;
            
            sectionNameInput.classList.remove('is-invalid');
            sectionNameError.textContent = '';
            factorySelect.classList.remove('is-invalid');
            factoryError.textContent = '';
            
            if (!name) {
                sectionNameError.textContent = 'Название не может быть пустым';
                sectionNameInput.classList.add('is-invalid');
                return;
            }
            
            if (!factoryId) {
                factoryError.textContent = 'Выберите фабрику';
                factorySelect.classList.add('is-invalid');
                return;
            }
            
            try {
                const response = await fetch('/sections/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `name=${encodeURIComponent(name)}&factory_id=${factoryId}`
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    window.location.reload();
                } else {
                    // Показываем ошибку от сервера
                    const errorMessage = result.error || 'Ошибка при создании';
                    if (errorMessage.includes('участок') || errorMessage.includes('названием')) {
                        sectionNameError.textContent = errorMessage;
                        sectionNameInput.classList.add('is-invalid');
                    } else {
                        sectionNameError.textContent = errorMessage;
                        sectionNameInput.classList.add('is-invalid');
                    }
                }
            } catch (error) {
                console.error('Ошибка:', error);
                sectionNameError.textContent = 'Ошибка сети. Попробуйте позже.';
                sectionNameInput.classList.add('is-invalid');
            }
        });
        
        sectionNameInput.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            sectionNameError.textContent = '';
        });
        
        factorySelect.addEventListener('change', function() {
            this.classList.remove('is-invalid');
            factoryError.textContent = '';
        });
        
        const modal = document.getElementById('createModal');
        if (modal) {
            modal.addEventListener('show.bs.modal', function() {
                sectionNameInput.value = '';
                sectionNameInput.classList.remove('is-invalid');
                sectionNameError.textContent = '';
                factorySelect.value = '';
                factorySelect.classList.remove('is-invalid');
                factoryError.textContent = '';
            });
        }
    }
    
    // ========== ФУНКЦИЯ ОТМЕНЫ РЕДАКТИРОВАНИЯ ==========
    function cancelEditing(row, nameDisplay, nameInput, factoryDisplay, factorySelect, editBtn, cancelBtn) {
        nameDisplay.style.display = 'inline';
        nameInput.style.display = 'none';
        factoryDisplay.style.display = 'inline-block';
        factorySelect.style.display = 'none';
        editBtn.innerHTML = '<i class="bi bi-pencil"></i> Изменить';
        editBtn.classList.remove('btn-success');
        editBtn.classList.add('btn-outline-primary');
        cancelBtn.style.display = 'none';
        // Возвращаем исходное значение имени
        nameInput.value = nameDisplay.textContent;
        
        // Возвращаем исходный выбранный элемент в select
        const currentFactoryText = factoryDisplay.querySelector('.badge').textContent;
        for (let option of factorySelect.options) {
            if (option.text === currentFactoryText) {
                factorySelect.value = option.value;
                break;
            }
        }
    }
    
    // ========== ОБРАБОТКА РЕДАКТИРОВАНИЯ УЧАСТКА ==========
    let currentEditingRow = null;
    
    async function saveSectionChanges(id, row, nameInput, nameDisplay, factorySelect, factoryDisplay, editBtn, cancelBtn) {
        const newName = nameInput.value.trim();
        const newFactoryId = factorySelect.value;
        
        if (!newName) {
            alert('Название не может быть пустым');
            return;
        }
        
        if (!newFactoryId) {
            alert('Выберите фабрику');
            return;
        }
        
        try {
            const response = await fetch(`/sections/${id}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `name=${encodeURIComponent(newName)}&factory_id=${newFactoryId}`
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Успешное сохранение
                nameDisplay.textContent = newName;
                const selectedFactoryText = factorySelect.options[factorySelect.selectedIndex].text;
                factoryDisplay.innerHTML = `<span class="badge bg-primary">${selectedFactoryText}</span>`;
                
                nameDisplay.style.display = 'inline';
                nameInput.style.display = 'none';
                factoryDisplay.style.display = 'inline-block';
                factorySelect.style.display = 'none';
                editBtn.innerHTML = '<i class="bi bi-pencil"></i> Изменить';
                editBtn.classList.remove('btn-success');
                editBtn.classList.add('btn-outline-primary');
                cancelBtn.style.display = 'none';
                currentEditingRow = null;
            } else {
                // Ошибка от сервера (дубликат и т.д.)
                alert(result.error || 'Ошибка при сохранении');
                // Остаемся в режиме редактирования
                nameInput.focus();
            }
        } catch (error) {
            console.error('Ошибка сети:', error);
            alert('Ошибка сети. Проверьте подключение и попробуйте снова.');
        }
    }
    
    document.querySelectorAll('.edit-section-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const row = document.getElementById(`section-row-${id}`);
            const nameDisplay = row.querySelector('.name-display');
            const nameInput = row.querySelector('.edit-name-input');
            const factoryDisplay = row.querySelector('.factory-display');
            const factorySelectElem = row.querySelector('.edit-factory-select');
            const editBtn = this;
            const cancelBtn = row.querySelector('.cancel-edit-btn');
            
            if (currentEditingRow === row) {
                // Сохраняем изменения
                saveSectionChanges(id, row, nameInput, nameDisplay, factorySelectElem, factoryDisplay, editBtn, cancelBtn);
            } else {
                // Если есть другая редактируемая строка, сначала отменяем её редактирование
                if (currentEditingRow) {
                    const prevRow = currentEditingRow;
                    const prevNameDisplay = prevRow.querySelector('.name-display');
                    const prevNameInput = prevRow.querySelector('.edit-name-input');
                    const prevFactoryDisplay = prevRow.querySelector('.factory-display');
                    const prevFactorySelect = prevRow.querySelector('.edit-factory-select');
                    const prevEditBtn = prevRow.querySelector('.edit-section-btn');
                    const prevCancelBtn = prevRow.querySelector('.cancel-edit-btn');
                    
                    cancelEditing(prevRow, prevNameDisplay, prevNameInput, prevFactoryDisplay, prevFactorySelect, prevEditBtn, prevCancelBtn);
                }
                
                // Включаем режим редактирования для текущей строки
                nameDisplay.style.display = 'none';
                nameInput.style.display = 'inline-block';
                factoryDisplay.style.display = 'none';
                factorySelectElem.style.display = 'inline-block';
                nameInput.focus();
                editBtn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
                editBtn.classList.remove('btn-outline-primary');
                editBtn.classList.add('btn-success');
                cancelBtn.style.display = 'inline-block';
                currentEditingRow = row;
                
                // Сохранение по Enter
                const handleKeyPress = function(e) {
                    if (e.key === 'Enter') {
                        saveSectionChanges(id, row, nameInput, nameDisplay, factorySelectElem, factoryDisplay, editBtn, cancelBtn);
                        nameInput.removeEventListener('keypress', handleKeyPress);
                    }
                };
                nameInput.addEventListener('keypress', handleKeyPress);
                
                // Отмена по Escape
                const handleKeyDown = function(e) {
                    if (e.key === 'Escape') {
                        cancelEditing(row, nameDisplay, nameInput, factoryDisplay, factorySelectElem, editBtn, cancelBtn);
                        currentEditingRow = null;
                        nameInput.removeEventListener('keydown', handleKeyDown);
                    }
                };
                nameInput.addEventListener('keydown', handleKeyDown);
                
                // Обработчик кнопки отмены
                cancelBtn.onclick = function() {
                    cancelEditing(row, nameDisplay, nameInput, factoryDisplay, factorySelectElem, editBtn, cancelBtn);
                    currentEditingRow = null;
                };
            }
        });
    });
});