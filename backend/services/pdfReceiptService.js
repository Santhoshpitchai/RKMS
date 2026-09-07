const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getSettings } = require('./settingsService');

// Create receipts directory if it doesn't exist
const receiptsDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
}

// Read logo and convert to base64 for embedding in HTML
const getLogoBase64 = () => {
    const logoPaths = [
        path.join(__dirname, '../../RKS Mahila Sangha/src/assets/RKMS Logo.png'),
        path.join(__dirname, '../../RKS Mahila Sangha Admin/src/assets/RKMS-Logo.png'),
    ];
    for (const logoPath of logoPaths) {
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            return `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    }
    return null;
};

// Convert amount to words (Indian numbering system)
const amountToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    const n = Math.floor(num);
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + amountToWords(n % 100) : '');
    if (n < 100000) return amountToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + amountToWords(n % 1000) : '');
    if (n < 10000000) return amountToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + amountToWords(n % 100000) : '');
    return amountToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + amountToWords(n % 10000000) : '');
};

// Generate donation receipt PDF
const generateDonationReceipt = async (donationData) => {
    try {
        const {
            name,
            email,
            phone,
            amount,
            purpose,
            panNumber,
            address,
            transactionId,
            date
        } = donationData;

        const settings = await getSettings();
        const logoBase64 = getLogoBase64();
        const formattedDate = new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const amountNum = parseFloat(amount);
        const amountInWords = amountToWords(amountNum) + ' Rupees Only';
        const receiptNo = 'A-' + (transactionId || 'TXN' + Date.now());
        const orgName = settings.organizationName || 'Raju Kshatriya Mahila Sangha';

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Donation Receipt & 80G Tax Certificate</title>
            <style>
                @page { size: A4 portrait; margin: 10mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
                body { background: #fff; color: #0f172a; font-size: 13px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .wrapper { border: 2px solid #0A6C87; padding: 24px; min-height: 98vh; display: flex; flex-direction: column; justify-content: space-between; border-radius: 8px; }
                
                /* Header */
                .header-banner { background: #0A6C87; color: white; padding: 20px; border-radius: 8px; display: flex; align-items: center; gap: 20px; }
                .logo-img { width: 75px; height: 75px; border-radius: 50%; background: white; padding: 3px; object-fit: cover; }
                .header-info h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px; }
                .header-info p { font-size: 11px; opacity: 0.9; margin-bottom: 2px; }
                .header-info .reg-highlight { font-size: 11px; font-weight: bold; color: #fde047; }
                
                /* Title Pill */
                .receipt-title { background: #0f172a; color: white; text-align: center; font-weight: 800; font-size: 12px; padding: 8px; margin: 16px 0; border-radius: 4px; letter-spacing: 1px; }

                /* 80G Box */
                .tax-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
                .tax-box h4 { color: #0A6C87; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
                .tax-box p { font-size: 10px; color: #334155; }

                /* Details Grid Table */
                .section-label { color: #0A6C87; font-weight: 800; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1.5px solid #0A6C87; padding-bottom: 4px; }
                .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                .grid-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
                .grid-table tr:nth-child(even) { background: #f8fafc; }
                .lbl { color: #475569; font-weight: 700; width: 140px; }
                .val { color: #0f172a; font-weight: 600; }

                /* Amount Box */
                .amount-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .amount-num { font-size: 24px; font-weight: 900; color: #065f46; }
                .amount-words { font-size: 11px; font-style: italic; color: #047857; text-align: right; }

                /* Signatures & Footer */
                .sig-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
                .seal-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; font-size: 10px; color: #475569; }
                .sig-box { text-align: right; font-size: 11px; }
                .sig-line { width: 180px; border-bottom: 1px solid #0A6C87; margin: 30px 0 6px auto; }
                
                .footer-address { text-align: center; border-top: 1.5px solid #0A6C87; padding-top: 10px; margin-top: 20px; font-size: 10px; color: #475569; }
                .footer-address strong { color: #0A6C87; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div>
                    <!-- Header Banner -->
                    <div class="header-banner">
                        ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="RKMS Logo" />` : '<div class="logo-img" style="display:flex;align-items:center;justify-content:center;font-weight:bold;color:#0A6C87;font-size:18px;">RKS</div>'}
                        <div class="header-info">
                            <h1>RAJU KSHATRIYA MAHILA SANGHA</h1>
                            <p>Registered under Karnataka Societies Registration Act, 1960 — Reg No: DRB1/SOR/343/2024-2025</p>
                            <p class="reg-highlight">80G Tax Exemption Reg No: 80G/DRB1/SOR/343/2024-2025</p>
                            <p>No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage, RR Nagar Post, Bengaluru - 560098</p>
                        </div>
                    </div>

                    <!-- Title Pill -->
                    <div class="receipt-title">OFFICIAL DONATION RECEIPT &amp; 80G TAX EXEMPTION CERTIFICATE</div>

                    <!-- 80G Notice Box -->
                    <div class="tax-box">
                        <h4>STATUTORY TAX EXEMPTION NOTICE (SECTION 80G)</h4>
                        <p>Donations to Raju Kshatriya Mahila Sangha are eligible for 50% deduction under Section 80G of the Income Tax Act, 1961 vide Order No. 80G/DRB1/SOR/343/2024-2025. This computer-generated receipt serves as official proof for IT returns filing.</p>
                    </div>

                    <!-- Details Grid Table -->
                    <div class="section-label">RECEIPT &amp; DONOR INFORMATION</div>
                    <table class="grid-table">
                        <tr>
                            <td class="lbl">Receipt No:</td>
                            <td class="val">${receiptNo}</td>
                            <td class="lbl">Receipt Date:</td>
                            <td class="val">${formattedDate}</td>
                        </tr>
                        <tr>
                            <td class="lbl">Donor Name:</td>
                            <td class="val">${name || 'Valued Supporter'}</td>
                            <td class="lbl">PAN Number:</td>
                            <td class="val">${panNumber || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="lbl">Email Address:</td>
                            <td class="val">${email || 'N/A'}</td>
                            <td class="lbl">Mobile Phone:</td>
                            <td class="val">${phone || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="lbl">Donor Address:</td>
                            <td class="val" colspan="3">${address || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="lbl">Donation Purpose:</td>
                            <td class="val" colspan="3">${purpose || 'General Support & Women Welfare'}</td>
                        </tr>
                        <tr>
                            <td class="lbl">Payment Gateway ID:</td>
                            <td class="val">${transactionId || 'N/A'}</td>
                            <td class="lbl">Payment Status:</td>
                            <td class="val" style="color:#047857; font-weight:800;">COMPLETED &amp; VERIFIED ✓</td>
                        </tr>
                    </table>

                    <!-- Amount Card -->
                    <div class="amount-card">
                        <div>
                            <div style="font-size:10px; font-weight:800; color:#047857; text-transform:uppercase;">Total Donation Amount Received</div>
                            <div class="amount-num">₹ ${amountNum.toLocaleString('en-IN')}.00</div>
                        </div>
                        <div class="amount-words">
                            <strong>Amount in Words:</strong><br>
                            ${amountInWords}
                        </div>
                    </div>
                </div>

                <div>
                    <!-- Signatures Section -->
                    <div class="sig-section">
                        <div class="seal-box">
                            <strong>VERIFIED &amp; RECORDED</strong><br>
                            Raju Kshatriya Mahila Sangha Audit System<br>
                            Computer Generated Document — Valid without physical signature
                        </div>
                        <div class="sig-box">
                            <strong>For RAJU KSHATRIYA MAHILA SANGHA</strong>
                            <div class="sig-line"></div>
                            <strong style="color:#0A6C87;">Authorized Signatory</strong><br>
                            <span style="color:#64748b; font-size:10px;">(Treasurer / Secretary)</span>
                        </div>
                    </div>

                    <!-- Footer Address -->
                    <div class="footer-address">
                        <strong>RAJU KSHATRIYA MAHILA SANGHA (REGD.)</strong><br>
                        Registered Office: No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage, 1st Block, Parallel to BDA Link Road,<br>
                        Rajarajeshwari Nagar Post, Bangalore – 560 098, Karnataka, India<br>
                        Contact: +91 9972648909 &nbsp;|&nbsp; Email: rajukshatriyamahilasangha2024@gmail.com &nbsp;|&nbsp; Web: www.rajukshatriyamahilasangha.org
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        // Generate filename
        const filename = `donation-receipt-${transactionId || Date.now()}.pdf`;
        const filePath = path.join(receiptsDir, filename);

        // Launch puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        await page.pdf({
            path: filePath,
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            }
        });

        await browser.close();

        return {
            success: true,
            filename,
            filePath,
            downloadUrl: `/uploads/receipts/${filename}`
        };

    } catch (error) {
        console.error('Error generating donation receipt PDF:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    generateDonationReceipt
};
