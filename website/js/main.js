(function () {
  'use strict';
  const RoadSigns = window.RoadSigns;
  if (!RoadSigns) return;

  RoadSigns.categoryData = null;
  RoadSigns.categoriesList = [];
  RoadSigns.compositesData = {};

  const categorySelect = document.getElementById('categorySelect');
  const mergeCheckbox = document.getElementById('mergeVersions');
  const onePerCellCheckbox = document.getElementById('onePerCell');
  const apiBaseInput = document.getElementById('apiBase');

  if (categorySelect) {
    categorySelect.addEventListener('change', function () {
      const id = categorySelect.value;
      if (id) RoadSigns.loadCategory(id);
    });
  }
  if (mergeCheckbox) {
    mergeCheckbox.addEventListener('change', function () {
      if (RoadSigns.categoryData) RoadSigns.renderTable();
    });
  }
  if (onePerCellCheckbox) {
    onePerCellCheckbox.addEventListener('change', function () {
      if (RoadSigns.categoryData) RoadSigns.renderTable();
    });
  }
  if (apiBaseInput) {
    apiBaseInput.addEventListener('change', RoadSigns.loadCategories);
    apiBaseInput.addEventListener('blur', RoadSigns.loadCategories);
  }

  RoadSigns.loadCategories();
})();
