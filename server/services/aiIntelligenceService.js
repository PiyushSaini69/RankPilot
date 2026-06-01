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


export const generateSingleSectionIntelligence = async (platform, sectionKey, data, siteName, acc) => {
    try {
        let prompt = "";
        let persona = "expert Marketing Intelligence Assistant";
        if (platform === 'gsc') persona = "expert SEO & Marketing Intelligence Assistant";
        
        let rawDataStr = "";
        let requestContext = "";

        if (platform === 'ga4') {
            if (sectionKey === 'activeUsers') {
                rawDataStr = `Active Users current: ${data.activeUsers?.value} vs last period: ${data.thisPeriodVsLastPeriod?.lastPeriod?.users} (${data.thisPeriodVsLastPeriod?.change?.users}% growth)`;
                requestContext = "Analyze these active user metrics and write a concise, data-driven 1-sentence summary + 1-sentence growth/retention insight.";
            } else if (sectionKey === 'totalSessions') {
                rawDataStr = `Sessions current: ${data.totalSessions?.value} vs last period: ${data.thisPeriodVsLastPeriod?.lastPeriod?.sessions} (${data.thisPeriodVsLastPeriod?.change?.sessions}% growth)`;
                requestContext = "Analyze these session metrics and write a concise, data-driven 1-sentence summary + 1-sentence traffic insight.";
            } else if (sectionKey === 'engagementRate') {
                rawDataStr = `Engagement Rate: ${data.engagementRate?.value}% (${data.engagementRate?.change}% change)`;
                requestContext = "Analyze this engagement rate and write a concise, data-driven 1-sentence summary + 1-sentence interaction insight.";
            } else if (sectionKey === 'avgSessionDuration') {
                rawDataStr = `Avg. Stay Duration: ${data.thisPeriodVsLastPeriod?.thisPeriod?.avgSessionDuration} vs last period: ${data.thisPeriodVsLastPeriod?.lastPeriod?.avgSessionDuration} (${data.thisPeriodVsLastPeriod?.change?.avgSessionDuration}% growth)`;
                requestContext = "Analyze this average stay duration and write a concise, data-driven 1-sentence summary + 1-sentence content resonance insight.";
            } else if (sectionKey === 'pageViews') {
                rawDataStr = `Page Views: ${data.pageViews}`;
                requestContext = "Analyze this page views volume and write a concise, data-driven 1-sentence summary + 1-sentence content discovery insight.";
            } else if (sectionKey === 'newUsers') {
                rawDataStr = `New Users: ${data.newUsers} vs Active Users: ${data.activeUsers?.value}`;
                requestContext = "Analyze these acquisition metrics and write a concise, data-driven 1-sentence summary + 1-sentence brand discovery/reach insight.";
            } else if (sectionKey === 'pagesPerSession') {
                rawDataStr = `Pages Per Session: ${data.pagesPerSession}`;
                requestContext = "Analyze this session depth metric and write a concise, data-driven 1-sentence summary + 1-sentence site exploration insight.";
            } else if (sectionKey === 'sessionsOverTime') {
                rawDataStr = `Sessions Over Time: ${JSON.stringify(data.sessionsOverTime || [])}`;
                requestContext = "Analyze the daily traffic pattern/trend over time. Identify weekend spikes or midweek dips. Write a concise, data-driven 1-sentence summary + 1-sentence trend insight.";
            } else if (sectionKey === 'newVsReturningUsers') {
                rawDataStr = `New Users: ${data.newVsReturningUsers?.totalNewUsers} (${data.newVsReturningUsers?.newUsersPercentage}%) vs Returning Users: ${data.newVsReturningUsers?.totalReturningUsers} (${data.newVsReturningUsers?.returningUsersPercentage}%)`;
                requestContext = "Analyze this customer loyalty/retention ratio and write a concise, data-driven 1-sentence summary + 1-sentence user loyalty insight.";
            } else if (sectionKey === 'engagementRates') {
                rawDataStr = `Engagement: ${data.engagementRate?.value}% rate, ${data.engagementRates?.engagedSessions} engaged sessions, and ${data.thisPeriodVsLastPeriod?.thisPeriod?.avgSessionDuration} avg duration`;
                requestContext = "Analyze these deep engagement metrics and write a concise, data-driven 1-sentence summary + 1-sentence conversion funnel/retention insight.";
            } else if (sectionKey === 'bounceRateOverTime') {
                rawDataStr = `Bounce Rate Over Time: ${JSON.stringify(data.bounceRateOverTime || [])}`;
                requestContext = "Analyze the daily bounce rate trend. Write a concise, data-driven 1-sentence summary + 1-sentence user experience retention insight.";
            } else if (sectionKey === 'pageViewsOverTime') {
                rawDataStr = `Page Views Over Time: ${JSON.stringify(data.pageViewsOverTime || [])}`;
                requestContext = "Analyze the daily page views volume and patterns. Write a concise, data-driven 1-sentence summary + 1-sentence volume optimization insight.";
            } else if (sectionKey === 'topTrafficSources') {
                rawDataStr = `Top Traffic Channels: ${JSON.stringify((data.topTrafficSources || []).slice(0, 5))}`;
                requestContext = "Analyze these traffic acquisition channels (Direct, Organic, Social, Referral, etc.). Write a concise, data-driven 1-sentence summary + 1-sentence source optimization insight.";
            } else if (sectionKey === 'topPages') {
                rawDataStr = `Top Performing Pages: ${JSON.stringify((data.topPages || []).slice(0, 5))}`;
                requestContext = "Analyze this page view traffic. Write a concise, data-driven 1-sentence summary + 1-sentence conversion path optimization insight for your top-performing content.";
            } else if (sectionKey === 'deviceBreakdown') {
                const devSum = (data.deviceBreakdown?.devices || []).map(d => `${d.name}: ${d.value} (${d.percentage}%)`).join(', ');
                rawDataStr = `Device Split: ${devSum || 'no data'}`;
                requestContext = "Analyze this device segment split. Write a concise, data-driven 1-sentence summary + 1-sentence UX/mobile-optimization insight.";
            } else if (sectionKey === 'topLocations') {
                const locSum = (data.topLocations || []).slice(0, 5).map(l => `${l.name}: ${l.value} (${l.percentage}%)`).join(', ');
                rawDataStr = `Top Countries/Regions: ${locSum || 'no data'}`;
                requestContext = "Analyze this geographical audience breakdown. Write a concise, data-driven 1-sentence summary + 1-sentence regional marketing growth opportunity insight.";
            } else if (sectionKey === 'thisPeriodVsLastPeriod') {
                rawDataStr = `Comparison metrics: Users (${data.thisPeriodVsLastPeriod?.change?.users}%), New Users (${data.thisPeriodVsLastPeriod?.change?.newUsers}%), Sessions (${data.thisPeriodVsLastPeriod?.change?.sessions}%), Views (${data.thisPeriodVsLastPeriod?.change?.pageViews}%), Bounce (${data.thisPeriodVsLastPeriod?.change?.bounceRate}%), Duration (${data.thisPeriodVsLastPeriod?.change?.avgSessionDuration}%)`;
                requestContext = "Analyze the complete trajectory across all metrics vs prior period. Write a concise, data-driven 1-sentence summary + 1-sentence strategic blueprint roadmap insight for long-term growth.";
            }
        } else if (platform === 'gsc') {
            if (sectionKey === 'searchClicks') {
                rawDataStr = `Clicks: ${data.searchClicks?.value} (${data.searchClicks?.change}% change, trajectory: ${data.searchClicks?.isPositive ? 'positive' : 'negative'})`;
                requestContext = "Analyze this GSC search clicks growth or decline. Write a concise, data-driven 1-sentence summary + 1-sentence traffic acquisition insight.";
            } else if (sectionKey === 'impressions') {
                rawDataStr = `Impressions: ${data.impressions?.value} (${data.impressions?.change}% change, trajectory: ${data.impressions?.isPositive ? 'positive' : 'negative'})`;
                requestContext = "Analyze this organic search visibility. Write a concise, data-driven 1-sentence summary + 1-sentence brand visibility insight.";
            } else if (sectionKey === 'avgCtr') {
                rawDataStr = `CTR: ${(data.avgCTR?.value || 0).toFixed(2)}% (${data.avgCTR?.change}% change)`;
                requestContext = "Analyze this Google search click-through rate. Write a concise, data-driven 1-sentence summary + 1-sentence click snippet title/meta optimization insight.";
            } else if (sectionKey === 'avgPosition') {
                rawDataStr = `Average Position: #${(data.avgPosition?.value || 0).toFixed(1)} (${data.avgPosition?.change}% change)`;
                requestContext = "Analyze this keyword ranking average trajectory. Write a concise, data-driven 1-sentence summary + 1-sentence overall rankings push insight.";
            } else if (sectionKey === 'totalQueries') {
                rawDataStr = `Indexed Queries: ${data.totalQueries}`;
                requestContext = "Analyze this search query footprint/breadth. Write a concise, data-driven 1-sentence summary + 1-sentence keyword scale/coverage insight.";
            } else if (sectionKey === 'totalPages') {
                rawDataStr = `Indexed Pages: ${data.totalPages}`;
                requestContext = "Analyze the active ranking pages. Write a concise, data-driven 1-sentence summary + 1-sentence indexation/content footprint insight.";
            } else if (sectionKey === 'topPosition') {
                rawDataStr = `Top Rank Position: #${data.topPosition?.toFixed(1)}`;
                requestContext = "Analyze this top rank positioning. Write a concise, data-driven 1-sentence summary + 1-sentence organic keyword excellence achievement insight.";
            } else if (sectionKey === 'searchPerformanceOverview') {
                rawDataStr = `Clicks and Impressions over time: ${JSON.stringify((data.searchPerformanceOverview || []).slice(-30))}`;
                requestContext = "Analyze the daily organic search clicks and impressions trends over the last 30 days. Write a concise, data-driven 1-sentence summary + 1-sentence performance trajectory insight.";
            } else if (sectionKey === 'clickThroughRateTrend') {
                rawDataStr = `CTR Trend over time: ${JSON.stringify((data.clickThroughRateTrend || []).slice(-30))}`;
                requestContext = "Analyze the daily click-through rate trend. Write a concise, data-driven 1-sentence summary + 1-sentence click performance insight.";
            } else if (sectionKey === 'averageRankingPosition') {
                rawDataStr = `Average Rank Position Trend over time: ${JSON.stringify((data.averageRankingPosition || []).slice(-30))}`;
                requestContext = "Analyze the daily rank position trend over time. Identify climbing or slipping periods. Write a concise, data-driven 1-sentence summary + 1-sentence ranking movement optimization insight.";
            } else if (sectionKey === 'lowCTRKeywords') {
                rawDataStr = `High Impressions / Low CTR queries: ${JSON.stringify((data.lowCTRKeywords || []).slice(0, 5))}`;
                requestContext = "Analyze these keywords that get thousands of eyes but very few clicks. Write a concise, data-driven 1-sentence summary + 1-sentence title tag and meta description optimization fix insight.";
            } else if (sectionKey === 'keywordsNearPage1') {
                rawDataStr = `Keywords close to Page 1 (ranked #8-#20): ${JSON.stringify((data.keywordsNearPage1 || []).slice(0, 5))}`;
                requestContext = "Analyze these highly valuable terms ranking on the edge of Google's page 1. Write a concise, data-driven 1-sentence summary + 1-sentence content push or internal linking strategy insight to propel them into the top 5.";
            } else if (sectionKey === 'topQueries') {
                rawDataStr = `Top Traffic Keywords: ${JSON.stringify((data.topQueries || []).slice(0, 5))}`;
                requestContext = "Analyze these top-performing search queries. Write a concise, data-driven 1-sentence summary + 1-sentence organic rankings protection and brand defense insight.";
            } else if (sectionKey === 'topLandingPages') {
                rawDataStr = `Top Organic Landing Pages: ${JSON.stringify((data.topLandingPages || []).slice(0, 5))}`;
                requestContext = "Analyze these top entrance pages. Write a concise, data-driven 1-sentence summary + 1-sentence conversion rate optimization or content update insight.";
            } else if (sectionKey === 'dailyImpressionVolume') {
                rawDataStr = `Daily Impressions: ${JSON.stringify((data.dailyImpressionVolume || []).slice(-30))}`;
                requestContext = "Analyze the daily impressions search reach trend. Write a concise, data-driven 1-sentence summary + 1-sentence brand discovery and brand authority density insight.";
            } else if (sectionKey === 'periodComparison') {
                rawDataStr = `GSC Comparison stats: Clicks (${data.periodComparison?.thisPeriod?.clicks} vs ${data.periodComparison?.lastPeriod?.clicks}), Impressions (${data.periodComparison?.thisPeriod?.impressions} vs ${data.periodComparison?.lastPeriod?.impressions}), CTR (${data.periodComparison?.thisPeriod?.ctr}% vs ${data.periodComparison?.lastPeriod?.ctr}%), Position (#${data.periodComparison?.thisPeriod?.position?.toFixed(1)} vs #${data.periodComparison?.lastPeriod?.position?.toFixed(1)})`;
                requestContext = "Analyze the complete search performance comparison vs prior period. Write a concise, data-driven 1-sentence summary + 1-sentence SEO strategy blueprint roadmap insight.";
            }
        } else if (platform === 'dash') {
            if (sectionKey === 'websiteSummary') {
                rawDataStr = `Total Sessions: ${data.ga4?.sessions}, Total Clicks: ${data.gsc?.clicks}, Total Ads Spend: $${((data.googleAds?.spend || 0) + (data.facebookAds?.spend || 0)).toFixed(2)}, Conversions: ${(data.googleAds?.conversions || 0) + (data.facebookAds?.conversions || 0)}`;
                requestContext = "Write a high-level big-picture executive website summary of overall site performance (under 25 words) for the business owner.";
            } else if (sectionKey === 'overviewGA4') {
                rawDataStr = `GA4 Sessions: ${data.ga4?.sessions} (${data.ga4?.growthSessions}% growth), Bounce Rate: ${data.ga4?.bounceRate}%`;
                requestContext = "Write an encouraging, data-driven summary + insight of GA4 traffic performance (under 25 words).";
            } else if (sectionKey === 'overviewGSC') {
                rawDataStr = `GSC Organic Clicks: ${data.gsc?.clicks} (${data.gsc?.growthClicks}% growth), Position: #${data.gsc?.position?.toFixed(1)}`;
                requestContext = "Write an encouraging summary + insight on Search Console visibility and ranking updates (under 25 words).";
            } else if (sectionKey === 'overviewGAds') {
                rawDataStr = `Google Ads Spend: $${data.googleAds?.spend} (${data.googleAds?.growthSpend}% spend change), Conversions: ${data.googleAds?.conversions} (${data.googleAds?.growthConversions}% growth)`;
                requestContext = "Write an encouraging summary + insight of Google Ads performance (under 25 words).";
            } else if (sectionKey === 'overviewFAds') {
                rawDataStr = `Meta/Facebook Spend: $${data.facebookAds?.spend} (${data.facebookAds?.growthSpend}% change), Reach: ${data.facebookAds?.reach} (${data.facebookAds?.growthReach}% growth)`;
                requestContext = "Write an encouraging summary + insight of Meta/Facebook advertising impact (under 25 words).";
            } else if (sectionKey === 'metricTraffic') {
                rawDataStr = `Sessions: ${data.ga4?.sessions} (${data.ga4?.growthSessions}% change)`;
                requestContext = "Write a concise traffic trend summary + insight (under 20 words).";
            } else if (sectionKey === 'metricClicks') {
                rawDataStr = `Organic Clicks: ${data.gsc?.clicks} (${data.gsc?.growthClicks}% change)`;
                requestContext = "Write a concise organic click progress summary + insight (under 20 words).";
            } else if (sectionKey === 'metricSpend') {
                rawDataStr = `Total Ad Spend: $${((data.googleAds?.spend || 0) + (data.facebookAds?.spend || 0)).toFixed(2)}`;
                requestContext = "Write a comforting, data-driven summary + insight of paid ad investments (under 20 words).";
            } else if (sectionKey === 'metricConversions') {
                rawDataStr = `Total Ad Conversions: ${(data.googleAds?.conversions || 0) + (data.facebookAds?.conversions || 0)}`;
                requestContext = "Write a motivating, high-conversion action summary + insight (under 20 words).";
            } else if (sectionKey === 'metricImpressions') {
                rawDataStr = `Total paid impressions/reach: ${(data.googleAds?.impressions || 0) + (data.facebookAds?.reach || 0)}`;
                requestContext = "Write a concise, data-driven brand awareness and visibility summary + insight (under 20 words).";
            } else if (sectionKey === 'metricEfficiency') {
                rawDataStr = `Google Ads CTR: ${((data.googleAds?.ctr || 0) * 100).toFixed(2)}%, Facebook Ads ROAS: ${data.facebookAds?.roas || 0}x`;
                requestContext = "Write a quick conversion efficiency tip/growth-hack based on CTR and ROAS (under 20 words).";
            } else if (sectionKey === 'adWinnerInsight') {
                rawDataStr = `Google Ads spend $${data.googleAds?.spend}, clicks ${data.googleAds?.clicks}, conversions ${data.googleAds?.conversions}, CPC $${data.googleAds?.cpc?.toFixed(2)}, CTR ${((data.googleAds?.ctr || 0) * 100).toFixed(2)}% vs Facebook Ads spend $${data.facebookAds?.spend}, clicks ${data.facebookAds?.clicks}, conversions ${data.facebookAds?.conversions}, CPC $${data.facebookAds?.cpc?.toFixed(2)}, CTR ${((data.facebookAds?.ctr || 0) * 100).toFixed(2)}%`;
                requestContext = "Provide a friendly, insightful comparison of which channel is winning and where to allocate future budget (under 40 words).";
            } else if (sectionKey === 'growthMatrixInsight') {
                rawDataStr = `GA4 traffic change: ${data.ga4?.growthSessions}%, GSC click change: ${data.gsc?.growthClicks}%, Google Ads conversions change: ${data.googleAds?.growthConversions}%, FB Ads reach change: ${data.facebookAds?.growthReach}%`;
                requestContext = "Perform a multi-channel growth journey trend review and growth hack recommendations (under 40 words).";
            } else if (sectionKey === 'topPagesInsight') {
                rawDataStr = `Top Page: ${data.topPages?.[0]?.url || 'Home'} with ${data.topPages?.[0]?.views} views, ${data.topPages?.[0]?.visitors} visitors`;
                requestContext = "Provide a conversion-rate optimization (CRO) recommendation to get more value out of this top page (under 40 words).";
            } else if (sectionKey === 'comparisonInsight') {
                rawDataStr = `Today vs Prior: Sessions (${data.ga4?.sessions} vs ${data.ga4?.priorSessions}), Clicks (${data.gsc?.clicks} vs ${data.gsc?.priorClicks}), Paid Spend ($${((data.googleAds?.spend || 0) + (data.facebookAds?.spend || 0)).toFixed(2)} vs $${((data.googleAds?.priorSpend || 0) + (data.facebookAds?.priorSpend || 0)).toFixed(2)})`;
                requestContext = "Analyze the overall performance progression and positive indicators over this period vs last period (under 40 words).";
            }
        }

        if (!rawDataStr) {
            return "No data available for this section.";
        }

        // Custom word limits based on section key size and complexity
        let wordLimit = 25; // Default for small KPI cards
        const largerKeys = [
            'sessionsOverTime', 'engagementRates', 'bounceRateOverTime', 'pageViewsOverTime', 
            'thisPeriodVsLastPeriod', 'searchPerformanceOverview', 'clickThroughRateTrend', 
            'averageRankingPosition', 'dailyImpressionVolume', 'periodComparison', 
            'growthMatrixInsight', 'topPagesInsight', 'comparisonInsight', 'adWinnerInsight'
        ];
        const mediumKeys = [
            'pageViews', 'newUsers', 'pagesPerSession', 'newVsReturningUsers',
            'topTrafficSources', 'topPages', 'topLocations', 'deviceBreakdown',
            'lowCTRKeywords', 'keywordsNearPage1', 'topQueries', 'topLandingPages', 'websiteSummary'
        ];

        if (largerKeys.includes(sectionKey)) {
            wordLimit = 55;
        } else if (mediumKeys.includes(sectionKey)) {
            wordLimit = 35;
        }

        prompt = `
          Act as a premium, highly encouraging "Marketing Coach" and expert ${persona} for the website "${siteName}". 
          Analyze this specific analytics data and provide a simple, warm, and highly understandable 1-2 sentence growth insight for the business owner.
          
          RAW DATA:
          ${rawDataStr}

          INSTRUCTION:
          ${requestContext}

          STRICT RULES:
          1. Respond with exactly one cohesive, simple 1-2 sentence paragraph.
          2. Speak like a friendly human coach. Use simple, everyday words. Do NOT use heavy marketing or SEO jargon without explaining it simply (e.g. explain CTR as "visitor click interest", CPC as "cost per click", and Bounce Rate as "visitors leaving quickly").
          3. Focus on clear business value: explain what this means for customer interest, traffic, or sales, and provide a single practical step to grow.
          4. Reference real numbers from RAW DATA where helpful.
          5. Keep the entire response under ${wordLimit} words for maximum impact.
          6. Do NOT use markdown bold stars (**), list bullet points, headers, or distinct labeled sections.
        `;

        const aiRes = await callGemini(prompt, [], "Respond ONLY with plain text.");
        return aiRes.content.trim();

    } catch (e) {
        console.error(`Failed to generate single-section intelligence for ${platform}.${sectionKey}`, e);
        return "Insight generation failed. Please try again.";
    }
};
