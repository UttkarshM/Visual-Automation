// Clear browser storage utility
// Run this in the browser console: copy and paste this code and press Enter

console.log('🧹 Clearing browser storage...');

// Clear localStorage
try {
  localStorage.clear();
  console.log('✅ localStorage cleared');
} catch (e) {
  console.log('❌ Error clearing localStorage:', e);
}

// Clear sessionStorage
try {
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
} catch (e) {
  console.log('❌ Error clearing sessionStorage:', e);
}

// Clear IndexedDB (used by Redux Persist)
try {
  if (window.indexedDB) {
    window.indexedDB.databases().then(databases => {
      databases.forEach(db => {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
          console.log(`✅ IndexedDB ${db.name} cleared`);
        }
      });
    });
  }
} catch (e) {
  console.log('❌ Error clearing IndexedDB:', e);
}

// Clear any persist:root key specifically
try {
  localStorage.removeItem('persist:root');
  console.log('✅ Redux persist:root cleared');
} catch (e) {
  console.log('❌ Error clearing persist:root:', e);
}

// Clear any automation-related keys
try {
  Object.keys(localStorage).forEach(key => {
    if (key.includes('automation') || key.includes('workflow') || key.includes('nodes')) {
      localStorage.removeItem(key);
      console.log(`✅ Cleared key: ${key}`);
    }
  });
} catch (e) {
  console.log('❌ Error clearing automation keys:', e);
}

console.log('🎉 Storage clearing complete! Please refresh the page.');
console.log('📝 Instructions:');
console.log('1. Refresh the page (F5 or Ctrl+R)');
console.log('2. Upload your file again');
console.log('3. Run the workflow');

