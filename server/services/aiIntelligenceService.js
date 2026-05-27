import { callGemini } from './geminiService.js';

export const getPlaceholderIntelligence = (platform, type = 'syncing') => {
    const messages = {
        syncing: "Syncing your data. AI insights will be available shortly.",
        no_data: "No data found for this period. AI insights will be available once traffic starts."
    };

    const message = messages[type] || messages.syncing;

    const keys = {
        dash: [
            'websiteSummary', 'overviewGA4', 'overviewGSC', 'overviewGAds', 'overviewFAds',
            'metricTraffic', 'metricClicks', 'metricSpend', 'metricConversions',
            'metricImpressions', 'metricEfficiency', 'adWinnerInsight',
            'growthMatrixInsight', 'topPagesInsight', 'comparisonInsight'
        ],
        ga4: [
            'activeUsers', 'totalSessions', 'engagementRate', 'avgSessionDuration',
            'pageViews', 'newUsers', 'pagesPerSession', 'sessionsOverTime',
            'newVsReturningUsers', 'engagementRates', 'bounceRateOverTime',
            'pageViewsOverTime', 'topTrafficSources', 'topPages',
            'deviceBreakdown', 'topLocations', 'thisPeriodVsLastPeriod'
        ],
        gsc: [
            'searchClicks', 'impressions', 'avgCtr', 'avgPosition', 'totalQueries',
            'totalPages', 'topPosition', 'searchPerformanceOverview',
            'clickThroughRateTrend', 'averageRankingPosition', 'lowCTRKeywords',
            'keywordsNearPage1', 'topQueries', 'topLandingPages',
            'dailyImpressionVolume', 'periodComparison'
        ]
    };

    const result = { [type === 'syncing' ? 'isSyncing' : 'noData']: true };
    (keys[platform] || []).forEach(key => {
        result[key] = message;
    });
    return result;
};

export const generateGa4Intelligence = async (data, siteName) => {
    try {
        const deviceSummary = (data.deviceBreakdown.devices || []).map(d => {
            return `${d.name}: ${d.value} (${d.percentage}%)`;
        }).join(', ');

        const locationSummary = (data.topLocations || []).slice(0, 5).map(l => {
            return `${l.name}: ${l.value} (${l.percentage}%)`;
        }).join(', ');

        const prompt = `
          Act as an expert Marketing Intelligence Assistant for the website "${siteName}". 
          Analyze this GA4 data and provide EXACTLY 17 friendly, data-driven summaries for the business owner.
          Your tone should be professional yet encouraging, using "you" and "your" to make it personal and actionable for ${siteName}.
          
          EXPECTED JSON FORMAT:
          {
            "activeUsers": "Active Users Card (10-12 words). Analyze ${data.activeUsers.value} vs ${data.thisPeriodVsLastPeriod.lastPeriod.users} (${data.thisPeriodVsLastPeriod.change.users}% growth). Provide a concise 1-sentence summary + 1-sentence insight.",
            "totalSessions": "Total Sessions Card (10-12 words). Analyze ${data.totalSessions.value} vs ${data.thisPeriodVsLastPeriod.lastPeriod.sessions} (${data.thisPeriodVsLastPeriod.change.sessions}% growth). Provide a concise 1-sentence summary + 1-sentence insight.",
            "engagementRate": "Engagement Rate Card (10-12 words). Rate is ${data.engagementRate.value}% (${data.engagementRate.change}% growth). Provide a concise 1-sentence summary + 1-sentence insight.",
            "avgSessionDuration": "Avg. Duration Card (10-12 words). Analyze ${data.thisPeriodVsLastPeriod.thisPeriod.avgSessionDuration} stay (${data.thisPeriodVsLastPeriod.change.avgSessionDuration}% growth). Provide a concise 1-sentence summary + 1-sentence insight.",
            "pageViews": "Page Views Strip (15-20 words). Analyze ${data.pageViews} views. Provide a clear summary + strategic insight on content discovery.",
            "newUsers": "New Users Strip (15-20 words). Analyze ${data.newUsers} new vs ${data.activeUsers.value} total. Provide a clear summary + strategic insight on your brand's reach.",
            "pagesPerSession": "Content Depth Strip (15-20 words). Average ${data.pagesPerSession} pages per session. Provide a clear 1-sentence summary + 1-sentence strategic insight.",
            "sessionsOverTime": "Sessions Trend Summary (40-45 words). Analyze the complete trend: ${JSON.stringify(data.sessionsOverTime)}. Identify patterns like weekend surges or mid-week dips over the entire period. Provide a 1-sentence summary + 1-sentence strategic insight.",
            "newVsReturningUsers": "Loyalty Summary (25-30 words). Analyze ${data.newVsReturningUsers.totalNewUsers} New (${data.newVsReturningUsers.newUsersPercentage}%) vs ${data.newVsReturningUsers.totalReturningUsers} Returning (${data.newVsReturningUsers.returningUsersPercentage}%). Provide a 1-sentence summary + 1-sentence strategic insight.",
            "engagementRates": "Engagement Deep Dive (70-80 words). Analyze ${data.engagementRate.value}% engagement, ${data.engagementRates.engagedSessions} engaged sessions, and ${data.thisPeriodVsLastPeriod.thisPeriod.avgSessionDuration} duration. Provide a 1-sentence summary + 1-sentence strategic optimization insight.",
            "bounceRateOverTime": "Bounce Trend (25-30 words). Analyze the full trend: ${JSON.stringify(data.bounceRateOverTime)}. Provide a 1-sentence summary + 1-sentence strategic retention insight.",
            "pageViewsOverTime": "Traffic Patterns (25-30 words). Analyze the full trend: ${JSON.stringify(data.pageViewsOverTime)}. Identify peak days like weekends. Provide a 1-sentence summary + 1-sentence strategic volume insight.",
            "topTrafficSources": "Traffic Channels (25-30 words). Analyze top sources: ${JSON.stringify((data.topTrafficSources || []).slice(0, 5))}. Analyze Organic vs Direct split. Provide a 1-sentence summary + 1-sentence strategic channel insight.",
            "topPages": "Content Performance (25-30 words). Analyze top pages: ${JSON.stringify((data.topPages || []).slice(0, 5))}. Provide a 1-sentence summary + 1-sentence strategic optimization insight.",
            "deviceBreakdown": "Device Experience (25-30 words). Analyze split: ${deviceSummary}. Provide a 1-sentence summary + 1-sentence strategic UX insight.",
            "topLocations": "Geo Opportunities (25-30 words). Analyze top 5 locations: ${locationSummary}. Provide a 1-sentence summary + 1-sentence strategic geo growth insight.",
            "thisPeriodVsLastPeriod": "Master Growth Report (70-80 words). Analyze trajectory: Users (${data.thisPeriodVsLastPeriod.change.users}%), New Users (${data.thisPeriodVsLastPeriod.change.newUsers}%), Sessions (${data.thisPeriodVsLastPeriod.change.sessions}%), Views (${data.thisPeriodVsLastPeriod.change.pageViews}%), Bounce (${data.thisPeriodVsLastPeriod.change.bounceRate}%), Duration (${data.thisPeriodVsLastPeriod.change.avgSessionDuration}%). Provide a 1-sentence summary + 1-sentence strategic future insight."
          }

          STRICT RULES:
          1. Maintain a high-quality "Marketing Coach" persona.
          2. Use "you" and "your" to refer to the user's data.
          3. Combine a clear SUMMARY with a friendly STRATEGIC INSIGHT.
          4. Strictly follow the word limits. NEVER include word counts or bracketed limits like "(25 words)" in your response.
        `;
        const aiRes = await callGemini(prompt, [], "Respond ONLY with JSON.");
        return JSON.parse(aiRes.content.replace(/```json|```/g, '').trim());
    } catch (error) {
        console.error("GA4 AI Intelligence failed:", error);
        return {
            isFallback: true,
            activeUsers: ((data.activeUsers?.value || 0) - (data.thisPeriodVsLastPeriod?.lastPeriod?.users || 0)) >= 0
                ? `Active users grew to ${data.activeUsers?.value || 0}. Your acquisition strategy is performing well.`
                : `Active users are at ${data.activeUsers?.value || 0}. Consider a campaign to boost your reach.`,
            totalSessions: ((data.totalSessions?.value || 0) - (data.thisPeriodVsLastPeriod?.lastPeriod?.sessions || 0)) >= 0
                ? `Sessions reached ${data.totalSessions?.value || 0}. Your site visibility is climbing steadily.`
                : `Sessions are at ${data.totalSessions?.value || 0}. Focus on driving more consistent daily traffic.`,
            engagementRate: ((data.thisPeriodVsLastPeriod?.thisPeriod?.bounceRate || 0) - (data.thisPeriodVsLastPeriod?.lastPeriod?.bounceRate || 0)) <= 0
                ? `Engagement is ${(data.engagementRate?.value || 0).toFixed(1)}%. Your content is resonating well with visitors.`
                : `Engagement rate is ${(data.engagementRate?.value || 0).toFixed(1)}%. Optimize top landing pages for better interaction.`,
            avgSessionDuration: `Average stay is ${data.thisPeriodVsLastPeriod?.thisPeriod?.avgSessionDuration || '0s'}. Your site successfully captures and holds visitor interest.`,
            pageViews: `Total views reached ${data.pageViews || 0}. Your content is widely discovered, indicating strong user interest across your site.`,
            newUsers: `Over ${data.newUsers || 0} new users suggest excellent reach for your brand, continuously expanding your audience base.`,
            pagesPerSession: `An average of ${data.pagesPerSession || 0} pages per session suggests users often explore one main page; consider improving internal linking.`,
            sessionsOverTime: `Your sessions show a ${((data.totalSessions?.value || 0) - (data.thisPeriodVsLastPeriod?.lastPeriod?.sessions || 0)) >= 0 ? 'healthy trend' : 'consistent pattern'} with periodic fluctuations over this analysis period. This trend demonstrates highly positive user engagement during your peak content publication days, which is key to maintaining consistent traffic flow and visibility.`,
            newVsReturningUsers: `Your audience boasts a great mix of ${data.newVsReturningUsers?.totalNewUsers || 0} new explorers and ${data.newVsReturningUsers?.totalReturningUsers || 0} loyal returning users. This balance shows your brand both attracts and retains interest.`,
            engagementRates: `Your outstanding ${(data.engagementRate?.value || 0).toFixed(1)}% engagement rate and nearly ${data.thisPeriodVsLastPeriod?.thisPeriod?.avgSessionDuration || '0s'} average session duration confirm that users genuinely value your content. This exceptional level of visitor retention demonstrates that your landing pages are highly relevant, effectively holding visitor interest, and successfully guiding them deep into your website's marketing funnel. Focus on optimizing high-traffic landing pages to convert this engaged audience into loyal subscribers.`,
            bounceRateOverTime: `Your bounce rate remains consistently ${(data.thisPeriodVsLastPeriod?.thisPeriod?.bounceRate || 0) < 30 ? 'low' : 'stable'}, generally around ${(data.thisPeriodVsLastPeriod?.thisPeriod?.bounceRate || 0).toFixed(1)}%. This indicates users are typically finding relevant information and staying on your site.`,
            pageViewsOverTime: `Your page views consistently peak towards the weekend, reflecting strong user interest during these days. This pattern suggests strategic content timing could be beneficial.`,
            topTrafficSources: `Organic search, especially ${data.topTrafficSources?.[0]?.source || 'Google'}, is your top traffic driver. Your strong channel mix highlights successful SEO and brand recall.`,
            topPages: `Your top page "${data.topPages?.[0]?.path || '/'}" is performing exceptionally well right now. Consider adding a friendly call-to-action here to convert this high volume of traffic into loyal brand subscribers.`,
            deviceBreakdown: `${data.deviceBreakdown?.devices?.[0]?.name || 'Desktop'} users are currently your biggest audience segment. Ensure your site experience is optimized for all screen sizes to keep these visitors highly engaged.`,
            topLocations: `Your brand is currently strongest in ${data.topLocations?.[0]?.name || 'your top region'}. Expanding your reach to similar geographical areas could unlock significant new growth opportunities.`,
            thisPeriodVsLastPeriod: `The overall growth trajectory for your ${data.activeUsers?.value || 0} active users is extremely ${((data.activeUsers?.value || 0) - (data.thisPeriodVsLastPeriod?.lastPeriod?.users || 0)) >= 0 ? 'positive' : 'stable'} this period. By continuing to scale your winning organic content pathways and expanding your brand reach across top traffic channels, you will secure high long-term conversion rates. Your current historical foundation remains exceptionally strong; focus on refining pages with high impressions but low click-through rates to maintain this fantastic growth momentum going forward.`
        };
    }
};

export const generateGscIntelligence = async (data, siteName) => {
    try {
        const prompt = `
          Act as an expert SEO & Marketing Intelligence Assistant for the website "${siteName}". 
          Analyze this Google Search Console (GSC) data and provide EXACTLY 10 friendly, data-driven summaries for the business owner.
          Your tone should be professional yet encouraging, using "you" and "your" to make it personal and actionable for ${siteName}.
          
          EXPECTED JSON FORMAT:
          {
            "searchClicks": "Search Clicks Card (8-10 words). Current Clicks: ${data?.searchClicks?.value ?? 0}, Growth/Change: ${data?.searchClicks?.change ?? 0}%, Trajectory: ${data?.searchClicks?.isPositive ? 'positive' : 'negative'}. Summarize the clicks growth or dip.",
            "impressions": "Impressions Card (8-10 words). Current Impressions: ${data?.impressions?.value ?? 0}, Growth/Change: ${data?.impressions?.change ?? 0}%, Trajectory: ${data?.impressions?.isPositive ? 'positive' : 'negative'}. Comment on search visibility.",
            "avgCtr": "Avg. CTR Card (8-10 words). Current Average CTR: ${(data?.avgCTR?.value ?? 0).toFixed(2)}%, Growth/Change: ${data?.avgCTR?.change ?? 0}%. Explain what this means for snippet attractiveness.",
            "avgPosition": "Avg. Position Card (8-10 words). Current Avg Position: #${(data?.avgPosition?.value ?? 0).toFixed(1)}, Growth/Change: ${data?.avgPosition?.change ?? 0}%. Comment on overall ranking trend.",
            "totalQueries": "Search Queries Summary (10-12 words). Total unique queries: ${data?.totalQueries ?? 0}. Discuss the breadth of your search reach.",
            "totalPages": "Total Pages Card (10-12 words). Total ranking pages: ${data?.totalPages ?? 0}. Comment on the scope of your content visibility.",
            "topPosition": "Top Position Strip (10-12 words). Best Rank position: #${(data?.topPosition ?? 0).toFixed(1)}. Comment on your highest achievement.",
            "searchPerformanceOverview": "Search Patterns (40-45 words). Analyze the clicks and impressions trend: ${JSON.stringify((data?.searchPerformanceOverview || []).slice(-30))}.",
            "clickThroughRateTrend": "CTR Trend Chart (20-25 words). Analyze this 30-day CTR trend: ${JSON.stringify((data?.clickThroughRateTrend || []).slice(-30))}. Comment on the engagement trajectory.",
            "averageRankingPosition": "Position Trend Chart (20-25 words). Analyze this 30-day ranking trend: ${JSON.stringify((data?.averageRankingPosition || []).slice(-30))}. Identify if you are climbing or slipping.",
            "lowCTRKeywords": "CTR Opportunities (20-25 words). Analyze these low-CTR high-visibility keywords: ${JSON.stringify((data?.lowCTRKeywords || []).slice(0, 30))}. Suggest quick fixes.",
            "keywordsNearPage1": "Close to Page 1 (20-25 words). Analyze these keywords ranking 8-20: ${JSON.stringify((data?.keywordsNearPage1 || []).slice(0, 30))}. Suggest a push strategy.",
            "topQueries": "Top Queries analysis (20-25 words). Analyze these top keywords: ${JSON.stringify((data?.topQueries || []).slice(0, 30))}. Identify keyword winners.",
            "topLandingPages": "Top Pages analysis (20-25 words). Analyze these top landing pages: ${JSON.stringify((data?.topLandingPages || []).slice(0, 30))}. Suggest content optimizations.",
            "dailyImpressionVolume": "Impression Volume Chart (40-45 words). Analyze this 30-day visibility trend: ${JSON.stringify((data?.dailyImpressionVolume || []).slice(-30))}. Comment on search reach density.",
            "periodComparison": "Master GSC Growth Report (40-45 words). Comprehensive comparison of current vs prior: Clicks (${data?.periodComparison?.thisPeriod?.clicks ?? 0} vs ${data?.periodComparison?.lastPeriod?.clicks ?? 0}), Impressions (${data?.periodComparison?.thisPeriod?.impressions ?? 0} vs ${data?.periodComparison?.lastPeriod?.impressions ?? 0}), CTR (${(data?.periodComparison?.thisPeriod?.ctr ?? 0).toFixed(2)}% vs ${(data?.periodComparison?.lastPeriod?.ctr ?? 0).toFixed(2)}%), Position (#${data?.periodComparison?.thisPeriod?.position?.toFixed(1) ?? '0.0'} vs #${data?.periodComparison?.lastPeriod?.position?.toFixed(1) ?? '0.0'}). Summarize overall SEO trajectory."
          }

          STRICT RULES:
          1. Maintain a high-quality "SEO Coach" persona.
          2. Use "you" and "your" to refer to the user's data.
          3. Combine a clear SUMMARY with a friendly STRATEGIC INSIGHT.
          4. NEVER include word counts, bracketed hints, or text like "(10 words)" in your response. Return ONLY the insight text.
        `;
        const aiRes = await callGemini(prompt, [], "Respond ONLY with JSON.");
        return JSON.parse(aiRes.content.replace(/```json|```/g, '').trim());
    } catch (error) {
        console.error("GSC AI Intelligence failed:", error);
        
        return {
            isFallback: true,
            searchClicks: (data?.searchClicks?.change || 0) >= 0
                ? `Search clicks grew to ${data?.searchClicks?.value || 0} (${data?.searchClicks?.change || 0}% growth). Your acquisition strategy is performing well.`
                : `Clicks are at ${data?.searchClicks?.value || 0} (${data?.searchClicks?.change || 0}% dip). Consider updating titles and descriptions to boost traffic.`,
            impressions: (data?.impressions?.change || 0) >= 0
                ? `Search visibility rose to ${data?.impressions?.value || 0} (${data?.impressions?.change || 0}% growth). Your brand is gaining consistent exposure.`
                : `Impressions are at ${data?.impressions?.value || 0} (${data?.impressions?.change || 0}% dip). Focus on expanding your keyword coverage and content reach.`,
            avgCtr: `Average CTR is ${(data?.avgCTR?.value || 0).toFixed(2)}% (change: ${data?.avgCTR?.change || 0}%). Optimizing search snippets could further boost user interest.`,
            totalPages: `You have ${data?.totalPages || 0} active ranking pages. This ensures multiple organic entrance points.`,
            avgPosition: (data?.avgPosition?.change || 0) >= 0
                ? `Average rank improved to #${(data?.avgPosition?.value || 0).toFixed(1)} (up ${data?.avgPosition?.change || 0}%). Your keywords are climbing search pages.`
                : `Average rank is at #${(data?.avgPosition?.value || 0).toFixed(1)} (${data?.avgPosition?.change || 0}% change). Target high-intent queries to regain rankings.`,
            topPosition: `Achieved a top position of #${Number(data?.topPosition || 0).toFixed(1)} across your search spectrum.`,
            clickThroughRateTrend: `Your click-through rate is averaging ${(data?.avgCTR?.value || 0).toFixed(2)}%. Consistent CTR trends indicate healthy audience engagement.`,
            averageRankingPosition: `Ranking position is holding at #${(data?.avgPosition?.value || 0).toFixed(1)}. Focus on content updates to maintain organic visibility.`,
            lowCTRKeywords: `You have high-impression keywords with lower-than-average CTR. Revamping search meta titles can quickly drive clicks.`,
            keywordsNearPage1: `Several keywords like "${(data?.keywordsNearPage1 || [])[0]?.query || 'secondary keywords'}" are very close to Google Page 1. A small content boost could push them to the top.`,
            dailyImpressionVolume: `Daily impression volume is stable at ${data?.impressions?.value || 0} total impressions. Continuous search reach builds steady brand authority.`,
            topQueries: `Your top queries drive the majority of your organic traffic. Focus on preserving these primary rankings.`,
            topLandingPages: `Top landing pages are valuable traffic sources. Maximize conversions on these pages to optimize ROI.`,
            totalQueries: `You are ranking for ${data?.totalQueries || 0} unique search queries. This diverse foundation helps growth.`,
            searchPerformanceOverview: `Your search trends show ${(data?.searchClicks?.change || 0) >= 0 ? 'positive growth' : 'steady performance'}. By analyzing weekly peaks, you can identify high-activity periods. Your current volume of ${data?.searchClicks?.value || 0} clicks indicates that your content strategy is effectively capturing organic demand across your core search terms.`,
            periodComparison: `Comparing today's metrics vs prior period shows a stable organic trajectory. Click growth is ${data?.searchClicks?.change || 0}% and impression growth is ${data?.impressions?.change || 0}%.`
        };
    }
};

export const generateDashboardIntelligence = async (data, acc) => {
    try {
        const conn = {
            ga4: !!acc?.ga4PropertyId,
            gsc: !!acc?.gscSiteUrl,
            googleAds: !!acc?.googleAdsCustomerId,
            facebookAds: !!acc?.facebookAdAccountId
        };

        const prompt = `
          Act as your expert Marketing Intelligence Assistant. Analyze this data and provide EXACTLY 15 friendly, data-driven one-liners for your website dashboard.
          Your tone should be professional, encouraging, and focused on "you" and "your" brand's growth.
          
          CONNECTION STATUS:
          - GA4: ${conn.ga4 ? 'ONLINE' : 'OFFLINE'}
          - GSC: ${conn.gsc ? 'ONLINE' : 'OFFLINE'}
          - Google Ads: ${conn.googleAds ? 'ONLINE' : 'OFFLINE'}
          - Facebook Ads: ${conn.facebookAds ? 'ONLINE' : 'OFFLINE'}

          RAW DATA:
          - GA4: ${conn.ga4 ? `${data.ga4.sessions} sessions (${data.ga4.growthSessions}% growth), ${data.ga4.users} users, ${data.ga4.bounceRate}% bounce (Prior: ${data.ga4.priorSessions} sessions)` : 'NO DATA'}
          - GSC: ${conn.gsc ? `${data.gsc.clicks} clicks (${data.gsc.growthClicks}% growth), ${data.gsc.impressions} impressions, #${data.gsc.position?.toFixed(1)} pos (Prior: ${data.gsc.priorClicks} clicks)` : 'NO DATA'}
          - Google Ads: ${conn.googleAds ? `$${data.googleAds.spend} spend (${data.googleAds.growthSpend}% growth), ${data.googleAds.conversions} conv (${data.googleAds.growthConversions}% growth), ${(data.googleAds.ctr * 100).toFixed(2)}% CTR` : 'NO DATA'}
          - FB Ads: ${conn.facebookAds ? `$${data.facebookAds.spend} spend (${data.facebookAds.growthSpend}% growth), ${data.facebookAds.roas}x ROAS, ${data.facebookAds.reach} reach (${data.facebookAds.growthReach}% growth)` : 'NO DATA'}
          - Top page: ${data.topPages[0]?.url || 'Home'} (${data.topPages[0]?.views || 0} views, ${data.topPages[0]?.visitors || 0} visitors).

          EXPECTED JSON FORMAT:
          {
            "websiteSummary": "A big-picture look at your site performance for ${data.siteName}. Mention ${data.ga4.sessions} sessions and ${data.gsc.clicks} clicks. (20-25 words).",
            "overviewGA4": "Friendly summary of your traffic (${data.ga4.sessions} sessions) and ${data.ga4.growthSessions}% growth. (25-30 words).",
            "overviewGSC": "Encouraging take on your Google search visibility with ${data.gsc.clicks} clicks and #${data.gsc.position?.toFixed(1)} avg position. (25-30 words).",
            "overviewGAds": "Simple summary of your Google Ads success: $${data.googleAds.spend} spend for ${data.googleAds.conversions} conversions. (25-30 words).",
            "overviewFAds": "Friendly look at your Facebook impact: $${data.facebookAds.spend} spend reaching ${data.facebookAds.reach} people with ${data.facebookAds.roas}x ROAS. (25-30 words).",
            "metricTraffic": "Simple take on your visit trends (${data.ga4.sessions} sessions). (20-25 words).",
            "metricClicks": "Encouraging note on your organic growth (${data.gsc.clicks} clicks). (20-25 words).",
            "metricSpend": "Comforting summary of your $${(data.googleAds.spend + data.facebookAds.spend).toFixed(2)} total ad investment. (20-25 words).",
            "metricConversions": "Exciting summary of your ${data.googleAds.conversions + data.facebookAds.conversions} total conversions. (20-25 words).",
            "metricImpressions": "A note on how many eyes (${data.googleAds.impressions + data.facebookAds.reach} impressions/reach) are seeing your brand. (20-25 words).",
            "metricEfficiency": "Quick tip on getting the most out of your budget based on your ${(data.googleAds.ctr * 100).toFixed(2)}% Google CTR and ${data.facebookAds.roas}x Meta ROAS. (20-25 words).",
            "adWinnerInsight": "A clear, friendly comparison of where you're winning most based on your Ad Platform Comparison table: Google ($${data.googleAds.spend} spend, ${data.googleAds.clicks} clicks, ${data.googleAds.conversions} conversions, $${data.googleAds.cpc.toFixed(2)} CPC, ${(data.googleAds.ctr * 100).toFixed(2)}% CTR) vs Meta ($${data.facebookAds.spend} spend, ${data.facebookAds.clicks} clicks, ${data.facebookAds.conversions} conversions, $${data.facebookAds.cpc.toFixed(2)} CPC, ${(data.facebookAds.ctr * 100).toFixed(2)}% CTR). (40-45 words).",
            "growthMatrixInsight": "Exciting analysis of your multi-channel growth journey. Analyze these trends: ${data.ga4.growthSessions}% sessions growth (GA4), ${data.gsc.growthClicks}% clicks growth (GSC), ${data.googleAds.growthConversions}% conversion growth (GAds), and ${data.facebookAds.growthReach}% reach growth (Meta). (40-45 words).",
            "topPagesInsight": "Simple advice on how to make your best page (${data.topPages[0]?.url || 'Home'} with ${data.topPages[0]?.views || 0} views and ${data.topPages[0]?.visitors || 0} unique visitors) work even harder. (40-45 words).",
            "comparisonInsight": "An encouraging look at your performance journey. Compare this period vs prior: Sessions (${data.ga4.sessions} vs ${data.ga4.priorSessions}), GSC Clicks (${data.gsc.clicks} vs ${data.gsc.priorClicks}), and Total Ad Spend ($${(data.googleAds.spend + data.facebookAds.spend).toFixed(2)} vs $${(data.googleAds.priorSpend + data.facebookAds.priorSpend).toFixed(2)}). (40-45 words).",
          }

          STRICT RULES:
          1. If a source is OFFLINE, the corresponding insight MUST be exactly: "Connect [Platform Name] to unlock your strategic insights."
          2. Maintain a "Marketing Coach" persona—professional but very accessible.
          3. Use "you" and "your" to refer to the data. 
          4. Strictly follow the word limits. NEVER include word counts or bracketed limits like "(25 words)" in your response.
        `;
        const aiRes = await callGemini(prompt, [], "Respond ONLY with JSON.");
        const parsedRes = JSON.parse(aiRes.content.replace(/```json|```/g, '').trim());

        return parsedRes;

    } catch (error) {
        console.error("Gemini AI failed, using Data-Driven Fallback Engine:", error);
        const conn = {
            ga4: !!acc?.ga4PropertyId,
            gsc: !!acc?.gscSiteUrl,
            googleAds: !!acc?.googleAdsCustomerId,
            facebookAds: !!acc?.facebookAdAccountId
        };
        return {
            isFallback: true,
            websiteSummary: `Your site performance for ${data.siteName} is looking stable with ${data.ga4.sessions} total sessions and ${data.gsc.clicks} organic clicks captured during this current analysis period.`,
            overviewGA4: conn.ga4 ? `Your traffic is holding steady at ${data.ga4.sessions} sessions with a ${data.ga4.growthSessions}% growth rate, showing that your audience engagement strategy is consistently reaching new people.` : "Connect Google Analytics 4 to unlock unique traffic insights and see how your users interact with your brand in real-time for better growth opportunities.",
            overviewGSC: conn.gsc ? `Your search visibility is active with ${data.gsc.clicks} clicks and an average position of #${data.gsc.position?.toFixed(1)}, indicating your content is ranking well for your target keywords.` : "Connect Google Search Console to monitor keyword performance and see which organic search terms are driving the most traffic to your primary content pages.",
            overviewGAds: conn.googleAds ? `Your Google Ads are performing with $${data.googleAds.spend} spend and ${data.googleAds.conversions} conversions, proving that your search campaigns are successfully driving valuable actions for your business.` : "Connect your Google Ads account to track your campaign efficiency and see how much value your search advertising is creating for your business overall.",
            overviewFAds: conn.facebookAds ? `Your Meta impact is clear with $${data.facebookAds.spend} spend reaching ${data.facebookAds.reach} people at a ${data.facebookAds.roas}x ROAS, showing strong resonance with your social audience.` : "Connect your Meta Ad account to measure your social reach and see how your creative assets are impacting your overall brand visibility and business growth.",
            metricTraffic: conn.ga4 ? `You've welcomed ${data.ga4.sessions} visitors this period; this consistent flow of traffic provides a solid foundation for your brand's digital growth and expansion.` : "Connect Google Analytics 4 to track your visitors and see how people interact with your site in real-time across all your pages.",
            metricClicks: conn.gsc ? `Your content earned ${data.gsc.clicks} clicks from Google; this organic interest shows that your SEO efforts are successfully capturing the attention of your target audience.` : "Link Google Search Console to see your search clicks and find out which keywords bring people to your site every single day.",
            metricSpend: (conn.googleAds || conn.facebookAds) ? `Your total ad investment of $${(data.googleAds.spend + data.facebookAds.spend).toFixed(2)} is being managed across platforms to ensure you're reaching customers where they are most active.` : "Connect your Ad accounts to monitor your spend and ensure every marketing dollar is working hard for your business and your goals.",
            metricConversions: (conn.googleAds || conn.facebookAds) ? `You have successfully captured ${data.googleAds.conversions + data.facebookAds.conversions} total conversions, showing that your marketing funnel is effectively turning visitors into valuable leads.` : "Connect your Ad accounts to track your goals and see exactly how much value your marketing efforts are creating for your site.",
            metricImpressions: (conn.googleAds || conn.facebookAds) ? `Your brand has earned ${data.googleAds.impressions + data.facebookAds.reach} total impressions and reach, significantly boosting your visibility and name recognition in the digital marketplace.` : "Connect your Ad accounts to see your reach and find out how many people are discovering your business through your paid campaigns.",
            metricEfficiency: (conn.googleAds || conn.facebookAds) ? `Your campaigns are operating with a ${(data.googleAds.ctr * 100).toFixed(2)}% Google CTR and ${data.facebookAds.roas}x Meta ROAS, showing a healthy level of efficiency in your current paid strategy.` : "Connect your Ad accounts to identify which campaigns are giving you the best return on your investment and reaching the right audience.",
            adWinnerInsight: (conn.googleAds && conn.facebookAds) ? `By comparing your performance across platforms, we see that Google Ads ($${data.googleAds.spend}) and Meta Ads ($${data.facebookAds.spend}) are both contributing to your overall growth. To maximize results, we recommend focusing your future budget on the specific channel currently delivering the lowest cost-per-action for your brand.` : "Connect both Google and Meta ads to compare them side-by-side; our AI will help you pick winners and spend your budget more effectively across every single digital channel.",
            growthMatrixInsight: `Your current multi-channel growth journey shows ${data.ga4.growthSessions}% session growth and ${data.gsc.growthClicks}% click growth this period. This positive upward trend suggests that your combined organic and paid strategies are working effectively together to expand your digital footprint and reach new potential customers across the web.`,
            topPagesInsight: conn.ga4 ? `Your top performing page (${data.topPages[0]?.url || 'Home'}) is attracting significant attention with ${data.topPages[0]?.views || 0} views this period. We suggest refining its conversion path and adding a clearer call-to-action to help you turn this high-intent traffic into even more measurable results and long-term brand loyalty.` : "Connect Google Analytics 4 to find your most popular content; knowing your best pages is key to making your entire website perform better.",
            comparisonInsight: `Comparing today's ${data.ga4.sessions} sessions to the prior period's ${data.ga4.priorSessions} sessions confirms that your marketing efforts are moving in the right direction. This steady increase in traffic across channels proves that your current strategy is resonating with your audience and building a solid foundation for your brand's long-term digital success.`
        };
    }
};
