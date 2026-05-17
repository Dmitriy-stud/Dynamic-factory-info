// Получаем данные участков из Python (заполняется в шаблоне)
const allSections = window.allSections || [];

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // ========== СКРИПТ ДЛЯ МОДАЛЬНОГО ОКНА СОЗДАНИЯ ==========
    const createForm = document.getElementById('createEquipmentForm');
    const createNameInput = document.getElementById('createEquipmentName');
    const createNameError = document.getElementById('createEquipmentNameError');
    
    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('#createSectionsList input[name="section_ids"]');
        const checkedCount = document.querySelectorAll('#createSectionsList input[name="section_ids"]:checked').length;
        const countSpan = document.getElementById('selectedCount');
        if (countSpan) {
            countSpan.textContent = `Выбрано: ${checkedCount}`;
        }
        
        checkboxes.forEach(checkbox => {
            const parentDiv = checkbox.closest('.section-checkbox-item');
            if (checkbox.checked) {
                parentDiv.style.backgroundColor = '#e7f3ff';
                parentDiv.style.borderLeft = '3px solid #0d6efd';
            } else {
                parentDiv.style.backgroundColor = 'white';
                parentDiv.style.borderLeft = 'none';
            }
        });
    }
    
    function selectAllCreate() {
        document.querySelectorAll('#createSectionsList input[name="section_ids"]').forEach(cb => cb.checked = true);
        updateSelectedCount();
    }
    
    function deselectAllCreate() {
        document.querySelectorAll('#createSectionsList input[name="section_ids"]').forEach(cb => cb.checked = false);
        updateSelectedCount();
    }
    
    if (createForm) {
        createForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = createNameInput.value.trim();
            
            createNameInput.classList.remove('is-invalid');
            createNameError.textContent = '';
            
            if (!name) {
                createNameError.textContent = 'Название не может быть пустым';
                createNameInput.classList.add('is-invalid');
                return;
            }
            
            const selectedSections = [];
            document.querySelectorAll('#createSectionsList input[name="section_ids"]:checked').forEach(cb => {
                selectedSections.push(cb.value);
            });
            
            const formData = new FormData();
            formData.append('name', name);
            selectedSections.forEach(sectionId => {
                formData.append('section_ids', sectionId);
            });
            
            try {
                const response = await fetch('/equipments/create', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    window.location.reload();
                } else {
                    createNameError.textContent = result.error || 'Ошибка при создании';
                    createNameInput.classList.add('is-invalid');
                }
            } catch (error) {
                createNameError.textContent = 'Ошибка сети';
                createNameInput.classList.add('is-invalid');
            }
        });
        
        createNameInput.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            createNameError.textContent = '';
        });
        
        const createModal = document.getElementById('createModal');
        if (createModal) {
            createModal.addEventListener('show.bs.modal', function() {
                createNameInput.value = '';
                createNameInput.classList.remove('is-invalid');
                createNameError.textContent = '';
                document.querySelectorAll('#createSectionsList input[name="section_ids"]').forEach(cb => cb.checked = false);
                updateSelectedCount();
            });
        }
    }
    
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllCreate);
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAllCreate);
    
    document.querySelectorAll('#createSectionsList input[name="section_ids"]').forEach(cb => {
        cb.addEventListener('change', updateSelectedCount);
    });
    
    document.querySelectorAll('#createSectionsList .section-checkbox-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = this.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    updateSelectedCount();
                }
            }
        });
    });
    
    updateSelectedCount();
    
    // ========== СКРИПТ ДЛЯ МОДАЛЬНОГО ОКНА РЕДАКТИРОВАНИЯ ==========
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editEquipmentForm');
    const editNameInput = document.getElementById('editEquipmentName');
    const editNameError = document.getElementById('editEquipmentNameError');
    let currentEquipmentId = null;
    
    function updateSelectedCountEdit() {
        const checkboxes = document.querySelectorAll('#editSectionsList input[name="section_ids_edit"]');
        const checkedCount = document.querySelectorAll('#editSectionsList input[name="section_ids_edit"]:checked').length;
        const countSpan = document.getElementById('selectedCountEdit');
        if (countSpan) {
            countSpan.textContent = `Выбрано: ${checkedCount}`;
        }
        
        checkboxes.forEach(checkbox => {
            const parentDiv = checkbox.closest('.section-checkbox-item');
            if (checkbox.checked) {
                parentDiv.style.backgroundColor = '#e7f3ff';
                parentDiv.style.borderLeft = '3px solid #0d6efd';
            } else {
                parentDiv.style.backgroundColor = 'white';
                parentDiv.style.borderLeft = 'none';
            }
        });
    }
    
    function populateSectionsList(selectedSectionIds) {
        const container = document.getElementById('editSectionsList');
        container.innerHTML = '';
        
        allSections.forEach(section => {
            const isChecked = selectedSectionIds.includes(section.id);
            const div = document.createElement('div');
            div.className = 'section-checkbox-item';
            div.innerHTML = `
                <label>
                    <input type="checkbox" name="section_ids_edit" value="${section.id}" ${isChecked ? 'checked' : ''}>
                    <strong>${escapeHtml(section.name)}</strong>
                    <span class="section-factory-name">
                        <i class="bi bi-building"></i> ${escapeHtml(section.factory_name)}
                    </span>
                </label>
            `;
            container.appendChild(div);
        });
        
        document.querySelectorAll('#editSectionsList .section-checkbox-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = this.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        updateSelectedCountEdit();
                    }
                }
            });
        });
        
        document.querySelectorAll('#editSectionsList input[name="section_ids_edit"]').forEach(cb => {
            cb.addEventListener('change', updateSelectedCountEdit);
        });
        
        updateSelectedCountEdit();
    }
    
    document.querySelectorAll('.edit-equipment-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            currentEquipmentId = this.dataset.id;
            const currentName = this.dataset.name;
            
            editNameInput.value = currentName;
            editNameInput.classList.remove('is-invalid');
            editNameError.textContent = '';
            
            try {
                const response = await fetch(`/equipments/${currentEquipmentId}/sections`);
                const data = await response.json();
                const currentSections = data.section_ids || [];
                populateSectionsList(currentSections);
            } catch (error) {
                console.error('Ошибка загрузки связей:', error);
                populateSectionsList([]);
            }
            
            editModal.show();
        });
    });
    
    document.getElementById('selectAllBtnEdit')?.addEventListener('click', () => {
        document.querySelectorAll('#editSectionsList input[name="section_ids_edit"]').forEach(cb => cb.checked = true);
        updateSelectedCountEdit();
    });
    
    document.getElementById('deselectAllBtnEdit')?.addEventListener('click', () => {
        document.querySelectorAll('#editSectionsList input[name="section_ids_edit"]').forEach(cb => cb.checked = false);
        updateSelectedCountEdit();
    });
    
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newName = editNameInput.value.trim();
            
            editNameInput.classList.remove('is-invalid');
            editNameError.textContent = '';
            
            if (!newName) {
                editNameError.textContent = 'Название не может быть пустым';
                editNameInput.classList.add('is-invalid');
                return;
            }
            
            const selectedSections = [];
            document.querySelectorAll('#editSectionsList input[name="section_ids_edit"]:checked').forEach(cb => {
                selectedSections.push(cb.value);
            });
            
            const formData = new FormData();
            formData.append('name', newName);
            selectedSections.forEach(sectionId => {
                formData.append('section_ids', sectionId);
            });
            
            try {
                const response = await fetch(`/equipments/${currentEquipmentId}/update`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    window.location.reload();
                } else {
                    editNameError.textContent = result.error || 'Ошибка при сохранении';
                    editNameInput.classList.add('is-invalid');
                }
            } catch (error) {
                editNameError.textContent = 'Ошибка сети';
                editNameInput.classList.add('is-invalid');
            }
        });
        
        editNameInput.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            editNameError.textContent = '';
        });
    }
});