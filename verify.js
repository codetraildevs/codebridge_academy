document.addEventListener('DOMContentLoaded', () => {
  const resultContainer = document.getElementById('verificationResult');
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('id');

  if (!studentId) {
    showError("No Certificate ID Provided", "Please scan a valid QR code or ensure the URL contains a valid certificate ID.");
    return;
  }

  // Fetch the students data
  fetch('students.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(students => {
      const student = students.find(s => s.id === studentId);
      
      if (student) {
        showSuccess(student);
      } else {
        showError("Invalid Certificate", `No records found for Certificate ID: ${studentId}. This certificate may be forged or invalid.`);
      }
    })
    .catch(error => {
      console.error('Error fetching verification data:', error);
      showError("System Error", "Unable to connect to the verification database. Please try again later.");
    });

  function showSuccess(student) {
    const modulesHtml = student.modules.map(module => `<li>${module}</li>`).join('');
    
    resultContainer.innerHTML = `
      <div class="status-banner valid">
        <div class="status-icon"><i class="fa-solid fa-check"></i></div>
        <div class="status-title">Verified Credential</div>
      </div>
      <div class="card-body">
        <h2 class="student-name">${student.name}</h2>
        <p class="program-name">${student.program}</p>
        
        <div class="details-grid">
          <div class="dates-container">
            <div class="detail-item">
              <div class="detail-label">Start Date</div>
              <div class="detail-value">${student.startDate}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">End Date</div>
              <div class="detail-value">${student.endDate}</div>
            </div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Certificate ID</div>
            <div class="detail-value" style="font-family: monospace;">${student.id}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Modules Completed</div>
            <ul class="modules-list">
              ${modulesHtml}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function showError(title, message) {
    resultContainer.innerHTML = `
      <div class="status-banner invalid">
        <div class="status-icon"><i class="fa-solid fa-xmark"></i></div>
        <div class="status-title">${title}</div>
      </div>
      <div class="card-body invalid-message">
        <p>${message}</p>
        <a href="index.html" class="btn-home">Return to Home</a>
      </div>
    `;
  }
});
