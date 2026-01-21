/**
 * Quality Control Compliance Certificate Generator
 * Generates professional HTML certificates that can be printed to PDF
 * Supports EN 206, ASTM C94, and other compliance standards
 */

interface QualityTestData {
    id: number;
    testName: string;
    testType: string;
    result: string;
    resultValue?: string;
    unit?: string;
    status: string;
    testedBy?: string;
    testedAt: Date;
    projectId?: number;
    deliveryId?: number;
    photos?: string; // JSON array
    photoUrls?: string; // JSON array
    notes?: string;
    inspectorSignature?: string; // base64
    supervisorSignature?: string; // base64
    gpsLocation?: string;
    testLocation?: string;
    standardUsed?: string;
    complianceStandard?: string;
}

interface ComplianceCertificateData {
    test: QualityTestData;
    project?: {
        id: number;
        name: string;
        location?: string;
    };
    delivery?: {
        id: number;
        ticketNumber?: string;
        concreteType?: string;
        volume?: number;
    };
    companyInfo: {
        name: string;
        logo?: string;
        address?: string;
        phone?: string;
        email?: string;
    };
}

/**
 * Generate HTML compliance certificate
 * Returns complete HTML document ready for printing or PDF conversion
 */
export function generateComplianceCertificateHTML(data: ComplianceCertificateData): string {
    const { test, project, delivery, companyInfo } = data;

    // Parse photo URLs if they exist
    let photoUrls: string[] = [];
    try {
        if (test.photoUrls) {
            photoUrls = JSON.parse(test.photoUrls);
        } else if (test.photos) {
            photoUrls = JSON.parse(test.photos);
        }
    } catch (error) {
        console.error('Error parsing photo URLs:', error);
    }

    // Format date
    const testDate = new Date(test.testedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    // Certificate number (based on test ID and date)
    const certificateNumber = `QC-${test.id}-${new Date(test.testedAt).getFullYear()}`;

    // Standard badge color
    const standardColor = test.status === 'pass' ? '#10b981' : test.status === 'fail' ? '#ef4444' : '#f59e0b';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quality Control Compliance Certificate - ${certificateNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .certificate {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border: 3px solid #FF6C0E;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #FF6C0E;
    }

    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #FF6C0E;
    }

    .logo img {
      max-height: 60px;
      width: auto;
    }

    .cert-number {
      text-align: right;
      color: #666;
    }

    .cert-number strong {
      display: block;
      font-size: 18px;
      color: #FF6C0E;
      margin-bottom: 5px;
    }

    .title {
      text-align: center;
      margin: 30px 0;
    }

    h1 {
      font-size: 32px;
      color: #222;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 5px;
    }

    .standard-badge {
      display: inline-block;
      padding: 8px 20px;
      background: ${standardColor};
      color: white;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 10px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }

    .info-section {
      background: #f9fafb;
      padding: 20px;
      border-left: 4px solid #FF6C0E;
    }

    .info-section h3 {
      font-size: 16px;
      color: #FF6C0E;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .info-item {
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
    }

    .info-label {
      font-weight: 600;
      color: #555;
      min-width: 140px;
    }

    .info-value {
      color: #222;
      flex: 1;
      text-align: right;
    }

    .test-result {
      text-align: center;
      padding: 30px;
      margin: 30px 0;
      background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
      border-radius: 8px;
    }

    .test-result h2 {
      font-size: 24px;
      margin-bottom: 15px;
      color: #222;
    }

    .result-value {
      font-size: 48px;
      font-weight: bold;
      color: ${standardColor};
      margin: 20px 0;
    }

    .result-status {
      display: inline-block;
      padding: 12px 30px;
      background: ${standardColor};
      color: white;
      border-radius: 25px;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .photos {
      margin: 30px 0;
    }

    .photos h3 {
      font-size: 18px;
      color: #222;
      margin-bottom: 15px;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .photo-item img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
    }

    .notes {
      background: #fff9e6;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
    }

    .notes h3 {
      color: #f59e0b;
      margin-bottom: 10px;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 40px 0;
      padding: 30px 0;
      border-top: 2px solid #e5e7eb;
    }

    .signature-box {
      text-align: center;
    }

    .signature-image {
      height: 80px;
      margin-bottom: 10px;
      border-bottom: 2px solid #222;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .signature-image img {
      max-height: 70px;
      max-width: 200px;
    }

    .signature-label {
      font-weight: 600;
      color: #555;
      margin-top: 10px;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      color: #666;
      font-size: 12px;
    }

    .company-info {
      margin-top: 15px;
    }

    /* Print styles */
    @media print {
      body {
        background: white;
        padding: 0;
      }

      .certificate {
        box-shadow: none;
        padding: 20px;
        max-width: 100%;
      }

      .photo-item img {
        break-inside: avoid;
      }

      .info-grid,
      .signatures {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="${companyInfo.name}">` : companyInfo.name}
      </div>
      <div class="cert-number">
        <strong>${certificateNumber}</strong>
        <div>${testDate}</div>
      </div>
    </div>

    <!-- Title -->
    <div class="title">
      <h1>Quality Control Certificate</h1>
      <div class="subtitle">Concrete Testing Compliance Certification</div>
      <div class="standard-badge">${test.complianceStandard || test.standardUsed || 'EN 206'}</div>
    </div>

    <!-- Information Grid -->
    <div class="info-grid">
      ${project ? `
      <div class="info-section">
        <h3>Project Information</h3>
        <div class="info-item">
          <span class="info-label">Project:</span>
          <span class="info-value">${project.name}</span>
        </div>
        ${project.location ? `
        <div class="info-item">
          <span class="info-label">Location:</span>
          <span class="info-value">${project.location}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${delivery ? `
      <div class="info-section">
        <h3>Delivery Information</h3>
        ${delivery.ticketNumber ? `
        <div class="info-item">
          <span class="info-label">Ticket Number:</span>
          <span class="info-value">${delivery.ticketNumber}</span>
        </div>
        ` : ''}
        ${delivery.concreteType ? `
        <div class="info-item">
          <span class="info-label">Concrete Type:</span>
          <span class="info-value">${delivery.concreteType}</span>
        </div>
        ` : ''}
        ${delivery.volume ? `
        <div class="info-item">
          <span class="info-label">Volume:</span>
          <span class="info-value">${delivery.volume} m³</span>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <div class="info-section">
        <h3>Test Details</h3>
        <div class="info-item">
          <span class="info-label">Test Name:</span>
          <span class="info-value">${test.testName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Test Type:</span>
          <span class="info-value">${test.testType.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
        ${test.testedBy ? `
        <div class="info-item">
          <span class="info-label">Inspector:</span>
          <span class="info-value">${test.testedBy}</span>
        </div>
        ` : ''}
        ${test.testLocation ? `
        <div class="info-item">
          <span class="info-label">Location:</span>
          <span class="info-value">${test.testLocation}</span>
        </div>
        ` : ''}
      </div>

      <div class="info-section">
        <h3>Compliance Standard</h3>
        <div class="info-item">
          <span class="info-label">Standard:</span>
          <span class="info-value">${test.complianceStandard || test.standardUsed || 'EN 206'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Test Date:</span>
          <span class="info-value">${testDate}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Certificate ID:</span>
          <span class="info-value">${certificateNumber}</span>
        </div>
      </div>
    </div>

    <!-- Test Result -->
    <div class="test-result">
      <h2>Test Result</h2>
      <div class="result-value">${test.result}${test.unit ? ' ' + test.unit : ''}</div>
      <div class="result-status">${test.status.toUpperCase()}</div>
    </div>

    <!-- Photos -->
    ${photoUrls.length > 0 ? `
    <div class="photos">
      <h3>Documentation Photos</h3>
      <div class="photo-grid">
        ${photoUrls.map(url => `
        <div class="photo-item">
          <img src="${url}" alt="Test Photo">
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Notes -->
    ${test.notes ? `
    <div class="notes">
      <h3>Inspector Notes</h3>
      <p>${test.notes}</p>
    </div>
    ` : ''}

    <!-- Signatures -->
    <div class="signatures">
      ${test.inspectorSignature ? `
      <div class="signature-box">
        <div class="signature-image">
          <img src="${test.inspectorSignature}" alt="Inspector Signature">
        </div>
        <div class="signature-label">Inspector Signature</div>
        ${test.testedBy ? `<div style="color: #666; font-size: 14px; margin-top: 5px;">${test.testedBy}</div>` : ''}
      </div>
      ` : `
      <div class="signature-box">
        <div class="signature-image"></div>
        <div class="signature-label">Inspector Signature</div>
      </div>
      `}

      ${test.supervisorSignature ? `
      <div class="signature-box">
        <div class="signature-image">
          <img src="${test.supervisorSignature}" alt="Supervisor Signature">
        </div>
        <div class="signature-label">Supervisor Approval</div>
      </div>
      ` : `
      <div class="signature-box">
        <div class="signature-image"></div>
        <div class="signature-label">Supervisor Approval</div>
      </div>
      `}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div><strong>This is an officially issued Quality Control Compliance Certificate</strong></div>
      <div class="company-info">
        ${companyInfo.name}
        ${companyInfo.address ? ` | ${companyInfo.address}` : ''}
        ${companyInfo.phone ? ` | Phone: ${companyInfo.phone}` : ''}
        ${companyInfo.email ? ` | Email: ${companyInfo.email}` : ''}
      </div>
      <div style="margin-top: 10px; color: #999;">
        Generated on ${new Date().toLocaleString()}
      </div>
    </div>
  </div>

  <script>
    // Auto-print functionality (optional)
    // Uncomment to auto-print when page loads
    // window.onload = () => window.print();
  </script>
</body>
</html>
  `.trim();
}

/**
 * Get default company information
 * Can be customized based on branding settings
 */
export function getDefaultCompanyInfo() {
    return {
        name: 'AzVirt Document Management System',
        address: 'Concrete Production \u0026 Quality Control',
        phone: '+387 XX XXX XXX',
        email: 'quality@azvirt.com',
    };
}
