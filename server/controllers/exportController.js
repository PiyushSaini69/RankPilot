import puppeteer from 'puppeteer';

export const exportPdf = async (req, res) => {
    try {
        const { urlPath, storageData, clientUrl: reqClientUrl } = req.body;

        if (!urlPath) {
            return res.status(400).json({ error: 'urlPath is required' });
        }

        const clientUrl = reqClientUrl;
        const fullUrl = `${clientUrl}${urlPath}`;

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(clientUrl, { waitUntil: 'networkidle0' });

        // Restore user session state
        if (storageData) {
            await page.evaluate((data) => {
                for (const [key, value] of Object.entries(data)) {
                    if (value) localStorage.setItem(key, value);
                }
            }, storageData);
        }

        await page.evaluate(() => localStorage.setItem('is-pdf-export', 'true'));
        await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for data skeletons to disappear
        try {
            await page.waitForFunction(() => {
                const pulses = document.querySelectorAll('.animate-pulse');
                const trueLoaders = Array.from(pulses).filter(el => {
                    // Ignore elements that are fixed, inside buttons, or inside hidden-for-pdf containers
                    if (el.closest('.fixed') || el.closest('button') || el.closest('.hide-in-pdf')) return false;
                    
                    // Also ignore elements that are hidden via style
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                    
                    return true;
                });
                return trueLoaders.length === 0;
            }, { timeout: 15000 });
        } catch (e) {
            console.warn('Timeout waiting for visible skeletons. Proceeding with export.');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Inject PDF-specific styling for continuous layout and performance
        await page.addStyleTag({
            content: `
                body, html, #root { height: auto !important; overflow: visible !important; }
                .h-screen { height: auto !important; min-height: 100vh !important; }
                .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
                aside, header, .fixed, .recharts-tooltip-wrapper, .blur-3xl { display: none !important; }
                .hide-in-pdf { display: none !important; }
                table, tr, .recharts-wrapper { page-break-inside: avoid !important; break-inside: avoid !important; }
                * { box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
                svg *, .recharts-wrapper * { transition: none !important; animation: none !important; }
            `
        });

        // Hide specific UI elements
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => {
                const text = btn.innerText.toUpperCase();
                if (['ASK AI', 'AI SUMMARY', 'PDF REPORT', 'GENERATING...', 'VIEW ALL'].some(t => text.includes(t))) {
                    btn.classList.add('hide-in-pdf');
                }
                if (btn.classList.contains('group/date') || btn.classList.contains('group/device')) {
                    const wrapper = btn.parentElement;
                    if (wrapper) {
                        wrapper.classList.add('hide-in-pdf');
                        if (wrapper.previousElementSibling?.classList.contains('w-px')) {
                            wrapper.previousElementSibling.classList.add('hide-in-pdf');
                        }
                    }
                }
            });
        });

        // Wait for reflowed chart animations to complete
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Inject custom RankPilot branding header
        await page.evaluate(() => {
            let presetRaw = '28d';
            let deviceRaw = 'all';
            
            try {
                const dateStorage = JSON.parse(localStorage.getItem('date-range-storage'));
                if (dateStorage?.state?.preset) presetRaw = dateStorage.state.preset;

                const filterStorage = JSON.parse(localStorage.getItem('filter-storage'));
                if (filterStorage?.state?.device) deviceRaw = filterStorage.state.device;
            } catch (e) {}

            const calculateDateRange = (preset) => {
                const path = window.location.pathname;
                const isGsc = path.includes('/gsc');
                
                const end = new Date();
                // GA4 is yesterday-anchored (1 day offset), GSC has 48h delay so it shifts 2 days offset (1 more day)
                end.setDate(end.getDate() - (isGsc ? 2 : 1));
                let start = new Date(end);

                if (preset === 'today') return `Today: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                if (preset === 'yesterday') return `Yesterday: ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

                if (preset === '7d') {
                    start.setDate(end.getDate() - 6);
                } else if (preset === '28d') {
                    start.setDate(end.getDate() - 27);
                } else if (preset === 'this_week') {
                    const today = new Date();
                    const day = today.getDay();
                    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                    const monday = new Date(today);
                    monday.setDate(diff);
                    const weekEnd = isGsc 
                        ? (day === 1 ? new Date(today.getTime() - 86400000) : new Date(end.getTime() - 86400000))
                        : (day === 1 ? today : end);
                    return `This Week: ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                } else if (preset === 'last_week') {
                    const today = new Date();
                    const day = today.getDay();
                    const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7;
                    const mondayLastWeek = new Date(today);
                    mondayLastWeek.setDate(diff);
                    const sundayLastWeek = new Date(mondayLastWeek);
                    sundayLastWeek.setDate(sundayLastWeek.getDate() + 6);
                    
                    if (isGsc) {
                        mondayLastWeek.setDate(mondayLastWeek.getDate() - 1);
                        sundayLastWeek.setDate(sundayLastWeek.getDate() - 1);
                    }
                    return `Last Week: ${mondayLastWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sundayLastWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                } else if (preset === '90d') {
                    start.setDate(end.getDate() - 89);
                } else if (preset === '12m' || preset === '1y') {
                    start.setFullYear(end.getFullYear() - 1);
                }

                return `Period: ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            };

            const deviceMap = { 'all': 'All Devices', 'desktop': 'Desktop', 'mobile': 'Mobile', 'tablet': 'Tablet' };
            const dateLabel = presetRaw === 'custom' ? 'Custom Range' : calculateDateRange(presetRaw);
            const deviceLabel = deviceMap[deviceRaw] || deviceRaw;

            let reportSubtitle = 'EXECUTIVE INTELLIGENCE REPORT';
            const path = window.location.pathname;
            if (path.includes('/ga4')) reportSubtitle = 'GOOGLE ANALYTICS 4 INTELLIGENCE REPORT';
            else if (path.includes('/gsc')) reportSubtitle = 'GOOGLE SEARCH CONSOLE INTELLIGENCE REPORT';
            else if (path.includes('/google-ads')) reportSubtitle = 'GOOGLE ADS PERFORMANCE REPORT';
            else if (path.includes('/facebook-ads')) reportSubtitle = 'FACEBOOK ADS PERFORMANCE REPORT';

            const headerHtml = `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px 32px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
                    <div>
                        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: 1px; margin: 0; display: flex; align-items: center; gap: 10px; color: #0f172a;">
                            <img src="/favicon.png" style="width: 32px; height: 32px; object-fit: contain;" alt="RankPilot" />
                            RANKPILOT
                        </h1>
                        <p style="font-size: 11px; color: #64748b; margin-top: 6px; text-transform: uppercase; font-weight: 700; letter-spacing: 2px;">${reportSubtitle}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 12px;">
                            <span style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 12px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; display: flex; align-items: center; gap: 6px;">📅 ${dateLabel}</span>
                            <span style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 12px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; display: flex; align-items: center; gap: 6px;">💻 ${deviceLabel}</span>
                        </div>
                        <p style="font-size: 14px; font-weight: 700; margin: 0; color: #0f172a;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p style="font-size: 11px; margin-top: 6px; font-weight: 500;">
                            <a href="https://rankpilot.sltechsoft.com" target="_blank" style="color: #64748b; text-decoration: none;">rankpilot.sltechsoft.com</a>
                        </p>
                    </div>
                </div>
            `;

            const mainContainer = document.querySelector('main > div') || document.querySelector('main') || document.body;
            const headerDiv = document.createElement('div');
            headerDiv.innerHTML = headerHtml;
            mainContainer.insertBefore(headerDiv.firstElementChild, mainContainer.firstChild);
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate seamless 1-page continuous PDF
        const bodyHeight = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
        const pdfBuffer = await page.pdf({
            width: '1440px',
            height: `${bodyHeight + 1}px`,
            printBackground: true,
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
            pageRanges: '1' // Strictly enforces single page layout
        });

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="export.pdf"'
        });

        res.end(pdfBuffer);
    } catch (error) {
        console.error('PDF Export Error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};
