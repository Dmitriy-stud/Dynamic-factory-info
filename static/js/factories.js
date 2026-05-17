// ========== ОБРАБОТКА СОЗДАНИЯ ФАБРИКИ ==========
document.addEventListener('DOMContentLoaded', function() {
    const createForm = document.getElementById('createFactoryForm');
    const nameInput = document.getElementById('factoryName');
    const nameError = document.getElementById('factoryNameError');
    
    if (createForm) {
        createForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = nameInput.value.trim();
            
            nameInput.classList.remove('is-invalid');
            nameError.textContent = '';
            
            if (!name) {
                nameError.textContent = 'Название не может быть пустым';
                nameInput.classList.add('is-invalid');
                return;
            }
            
            try {
                const response = await fetch('/factories/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `name=${encodeURIComponent(name)}`
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    window.location.reload();
                } else {
                    nameError.textContent = result.error || 'Ошибка при создании';
                    nameInput.classList.add('is-invalid');
                }
            } catch (error) {
                nameError.textContent = 'Ошибка сети. Попробуйте позже.';
                nameInput.classList.add('is-invalid');
            }
        });
        
        nameInput.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            nameError.textContent = '';
        });
        
        const modal = document.getElementById('createModal');
        if (modal) {
            modal.addEventListener('show.bs.modal', function() {
                nameInput.value = '';
                nameInput.classList.remove('is-invalid');
                nameError.textContent = '';
            });
        }
    }
    
    // ========== ФУНКЦИЯ ОТМЕНЫ РЕДАКТИРОВАНИЯ ==========
    function cancelEditing(id, displaySpan, editInput, editBtn, cancelBtn) {
        displaySpan.style.display = 'inline';
        editInput.style.display = 'none';
        editBtn.innerHTML = '<i class="bi bi-pencil"></i> Изменить';
        editBtn.classList.remove('btn-success');
        editBtn.classList.add('btn-outline-primary');
        cancelBtn.style.display = 'none';
        editInput.value = displaySpan.textContent;
    }
    
    // ========== ОБРАБОТКА РЕДАКТИРОВАНИЯ ФАБРИКИ ==========
    async function saveFactoryChanges(id, editInput, displaySpan, editBtn, cancelBtn) {
        const newName = editInput.value.trim();
        
        if (!newName) {
            alert('Название не может быть пустым');
            return;
        }
        
        try {
            const response = await fetch(`/factories/${id}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `name=${encodeURIComponent(newName)}`
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                displaySpan.textContent = newName;
                displaySpan.style.display = 'inline';
                editInput.style.display = 'none';
                editBtn.innerHTML = '<i class="bi bi-pencil"></i> Изменить';
                editBtn.classList.remove('btn-success');
                editBtn.classList.add('btn-outline-primary');
                cancelBtn.style.display = 'none';
                
                const relationsLink = editBtn.closest('tr').querySelector('.btn-warning');
                if (relationsLink) {
                    relationsLink.href = `/relations/factory/${id}`;
                }
            } else {
                alert(result.error || 'Ошибка при сохранении');
            }
        } catch (error) {
            alert('Ошибка сети. Попробуйте позже.');
        }
    }
    
    document.querySelectorAll('.edit-factory-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const row = document.getElementById(`factory-row-${id}`);
            const displaySpan = row.querySelector('.name-display');
            const editInput = row.querySelector('.edit-input');
            const editBtn = this;
            const cancelBtn = row.querySelector('.cancel-edit-btn');
            
            if (editInput.style.display === 'none') {
                displaySpan.style.display = 'none';
                editInput.style.display = 'inline-block';
                editInput.focus();
                editBtn.innerHTML = '<i class="bi bi-check-lg"></i> Сохранить';
                editBtn.classList.remove('btn-outline-primary');
                editBtn.classList.add('btn-success');
                cancelBtn.style.display = 'inline-block';
                
                const handleKeyPress = function(e) {
                    if (e.key === 'Enter') {
                        saveFactoryChanges(id, editInput, displaySpan, editBtn, cancelBtn);
                        editInput.removeEventListener('keypress', handleKeyPress);
                    }
                };
                editInput.addEventListener('keypress', handleKeyPress);
                
                const handleKeyDown = function(e) {
                    if (e.key === 'Escape') {
                        cancelEditing(id, displaySpan, editInput, editBtn, cancelBtn);
                        editInput.removeEventListener('keydown', handleKeyDown);
                    }
                };
                editInput.addEventListener('keydown', handleKeyDown);
                
                cancelBtn.onclick = function() {
                    cancelEditing(id, displaySpan, editInput, editBtn, cancelBtn);
                };
            } else {
                saveFactoryChanges(id, editInput, displaySpan, editBtn, cancelBtn);
            }
        });
    });
});