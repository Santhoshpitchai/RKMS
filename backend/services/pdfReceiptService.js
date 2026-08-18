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
            <title>Donation Receipt</title>
            <style>
                @page {
                    size: A4 landscape;
                    margin: 12mm;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #fff;
                    color: #333;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .receipt {
                    width: 100%;
                    border: 3px double #444;
                    background: #fff;
                    padding: 0;
                    overflow: hidden;
                }

                /* ── Header ── */
                .header {
                    text-align: center;
                    position: relative;
                    border-bottom: 2px solid #444;
                    padding: 14px 10px 12px;
                }
                .header-logo {
                    position: absolute;
                    left: 14px;
                    top: 10px;
                    width: 78px;
                    height: 78px;
                }
                .header-logo img {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .header-reg {
                    position: absolute;
                    right: 10px;
                    top: 10px;
                    background: #7a2c2c;
                    color: #fff;
                    padding: 5px 12px;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }
                .header h1 {
                    font-size: 26px;
                    letter-spacing: 3px;
                    color: #c0392b;
                    margin-bottom: 2px;
                }
                .header h2 {
                    font-size: 18px;
                    font-weight: 700;
                    color: #c0392b;
                }

                /* ── Rows ── */
                .row {
                    display: flex;
                    border-bottom: 1px solid #444;
                }
                .cell {
                    padding: 7px 10px;
                    border-right: 1px solid #444;
                    display: flex;
                    align-items: center;
                }
                .cell:last-child {
                    border-right: none;
                }

                /* ── Receipt info row ── */
                .receipt-row .label-cell {
                    background: #f2e8b6;
                    font-weight: bold;
                    color: #c0392b;
                    width: 110px;
                    min-width: 110px;
                    font-size: 13px;
                    justify-content: center;
                }
                .receipt-row .value-cell {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 600;
                }
                .receipt-row .donor-copy-cell {
                    background: #7a2c2c;
                    color: #fff;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 600;
                    width: 170px;
                    min-width: 170px;
                    flex-direction: column;
                    justify-content: center;
                    line-height: 1.5;
                }

                /* ── Rupees row ── */
                .rupees-row .cell {
                    font-size: 14px;
                    padding: 6px 10px;
                    width: 100%;
                }

                /* ── Donor Details ── */
                .section-title {
                    background: #7a2c2c;
                    color: #fff;
                    text-align: center;
                    padding: 5px;
                    font-weight: bold;
                    font-size: 14px;
                    letter-spacing: 1px;
                    border-bottom: 1px solid #444;
                }
                .details-row {
                    display: flex;
                    border-bottom: 1px solid #444;
                }
                .details-left {
                    flex: 1;
                    border-right: 1px solid #444;
                    padding: 10px 14px;
                    font-size: 13px;
                }
                .details-right {
                    flex: 1;
                    padding: 10px 14px;
                    font-size: 13px;
                }
                .field-label {
                    color: #555;
                    font-size: 12px;
                    margin-bottom: 2px;
                }
                .field-label.red {
                    color: #c0392b;
                    font-weight: 600;
                    font-style: italic;
                }
                .field-value {
                    border-bottom: 1px dotted #888;
                    min-height: 22px;
                    padding: 3px 0;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 10px;
                    word-break: break-word;
                }
                .field-value.tall {
                    min-height: 50px;
                }

                /* ── Bottom bar ── */
                .bottom-row {
                    display: flex;
                    border-bottom: 1px solid #444;
                    align-items: center;
                    min-height: 55px;
                }
                .amount-box {
                    width: 220px;
                    min-width: 220px;
                    padding: 8px 14px;
                    border-right: 1px solid #444;
                    display: flex;
                    align-items: center;
                }
                .amount-box-inner {
                    border: 2px solid #999;
                    border-radius: 10px;
                    height: 40px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    padding-left: 14px;
                    font-size: 22px;
                    font-weight: bold;
                    color: #333;
                }
                .rupee-symbol {
                    font-family: 'Segoe UI', sans-serif;
                    margin-right: 6px;
                }
                .org-name-cell {
                    flex: 1;
                    text-align: center;
                    font-weight: bold;
                    font-size: 14px;
                    padding: 8px;
                    border-right: 1px solid #444;
                    color: #333;
                }
                .signature-cell {
                    width: 240px;
                    min-width: 240px;
                    text-align: right;
                    padding: 8px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #555;
                }

                /* ── Footer ── */
                .footer {
                    background: #c8dbe6;
                    padding: 10px 16px;
                    text-align: center;
                    font-size: 13px;
                    line-height: 1.6;
                    color: #333;
                    font-weight: 500;
                }
                .footer strong {
                    font-size: 13px;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <!-- Header -->
                <div class="header">
                    <div class="header-logo">
                        ${logoBase64 ? `<img src="${logoBase64}" alt="RKMS Logo" />` : '<div style="width:78px;height:78px;border-radius:50%;background:#daa520;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;color:#333;">RKMS</div>'}
                    </div>
                    <div class="header-reg">Reg. No. DRB1/SOR/343/2024-2025.</div>
                    <h1>RECEIPT</h1>
                    <h2>${orgName} (Regd)</h2>
                </div>

                <!-- Receipt Info Row -->
                <div class="row receipt-row">
                    <div class="cell label-cell">Receipt No.</div>
                    <div class="cell value-cell">${receiptNo}</div>
                    <div class="cell label-cell">Date:</div>
                    <div class="cell value-cell">${formattedDate}</div>
                    <div class="cell donor-copy-cell">
                        DONOR'S COPY<br>(T&amp;C on backside for 80G, 12A)
                    </div>
                </div>

                <!-- Rupees Row -->
                <div class="row rupees-row">
                    <div class="cell" style="width:100%;">
                        Rupees <strong>${amountInWords}</strong>
                    </div>
                </div>

                <!-- Donor Details Title -->
                <div class="section-title">Donor Details</div>

                <!-- Donor Details Content -->
                <div class="details-row">
                    <!-- Left Column -->
                    <div class="details-left">
                        <div class="field-label">Received with thanks from Kum./Smt./Sri:</div>
                        <div class="field-value">${name || ''}</div>

                        <div class="field-label">Address:</div>
                        <div class="field-value tall">${address || ''}</div>

                        <div class="field-label">Donor PAN No:</div>
                        <div class="field-value">${panNumber || ''}</div>

                        <div class="field-label">Mobile:</div>
                        <div class="field-value">${phone || ''}</div>
                    </div>

                    <!-- Right Column -->
                    <div class="details-right">
                        <div class="field-label red">Purpose (Membership / Donation / Health / Scholarship)</div>
                        <div class="field-value">${purpose || ''}</div>

                        <div class="field-label red">Mode of payment (Cheque / online / UPI / Cash)</div>
                        <div class="field-value">Online (Razorpay Payment Gateway)</div>

                        <div class="field-label red">Payment Details (Cheque / Transaction Details)</div>
                        <div class="field-value tall">Transaction ID: ${transactionId || ''}</div>
                    </div>
                </div>

                <!-- Bottom Row -->
                <div class="bottom-row">
                    <div class="amount-box">
                        <div class="amount-box-inner">
                            <span class="rupee-symbol">₹</span> ${amountNum.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div class="org-name-cell">
                        ${orgName}<br>(Regd)
                    </div>
                    <div class="signature-cell">
                        Signature of Treasurer / Secretary
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <strong>Office Address*:</strong> No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage,<br>
                    1st Block, Parallel to BDA Link Road, Rajarajeshwari Nagar Post, Bangalore-560 098<br>
                    Tel: 9972648909
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
