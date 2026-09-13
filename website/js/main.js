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

  // Extract category from URL path (e.g., /vienna-a -> VIENNA-A)
  function getCategoryFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/^\/([a-z0-9\-]+)$/i);
    if (match) {
      return match[1].toUpperCase();
    }
    return null;
  }

  // Update URL when category changes
  function updateUrlForCategory(categoryId) {
    if (categoryId) {
      const url = '/' + categoryId.toLowerCase();
      window.history.pushState({ category: categoryId }, '', url);
    }
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', function () {
      const id = categorySelect.value;
      if (id) {
        updateUrlForCategory(id);
        RoadSigns.loadCategory(id);
      }
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

  // Store original loadCategories function
  const originalLoadCategories = RoadSigns.loadCategories;

  // Override loadCategories to handle URL-based category selection
  RoadSigns.loadCategories = function () {
    // Call original function
    originalLoadCategories.call(RoadSigns);

    // After categories are loaded, check for URL-based category
    const urlCategory = getCategoryFromUrl();
    if (urlCategory && categorySelect) {
      // Wait for categories to load
      const checkAndSelect = setInterval(function () {
        if (RoadSigns.categoriesList && RoadSigns.categoriesList.length > 0) {
          clearInterval(checkAndSelect);
          const found = RoadSigns.categoriesList.find(function (cat) {
            return cat.category === urlCategory;
          });
          if (found && categorySelect.value !== found.category) {
            categorySelect.value = found.category;
            RoadSigns.loadCategory(found.category);
          }
        }
      }, 50);

      // Timeout after 2 seconds
      setTimeout(function () { clearInterval(checkAndSelect); }, 2000);
    }
  };

  // Initial load
  RoadSigns.loadCategories();

  // Handle browser back/forward
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.category && categorySelect) {
      categorySelect.value = e.state.category;
      categorySelect.dispatchEvent(new Event('change'));
    }
  });
})();
