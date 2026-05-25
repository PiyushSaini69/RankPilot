import { z } from 'zod';

export const selectAccountsSchema = z.object({
  body: z.object({
    siteId: z.string().nullable().optional(),
    siteName: z.string().min(1, "Site name is required"),
    siteUrl: z.string().nullable().optional(),
    // GA4
    ga4PropertyId: z.string().nullable().optional(),
    ga4PropertyName: z.string().nullable().optional(),
    ga4AccountId: z.string().nullable().optional(),
    ga4TokenId: z.string().nullable().optional(),
    // GSC
    gscSiteUrl: z.string().nullable().optional(),
    gscPermission: z.string().nullable().optional(),
    gscTokenId: z.string().nullable().optional(),
    // Google Ads
    googleAdsCustomerId: z.string().nullable().optional(),
    googleAdsAccountName: z.string().nullable().optional(),
    googleAdsCurrencyCode: z.string().nullable().optional(),
    googleAdsTokenId: z.string().nullable().optional(),
    // Facebook
    facebookAdAccountId: z.string().nullable().optional(),
    facebookAdAccountName: z.string().nullable().optional(),
    facebookAdCurrencyCode: z.string().nullable().optional(),
    facebookTokenId: z.string().nullable().optional(),
  }),
});

export const siteIdParamSchema = z.object({
  params: z.object({
    siteId: z.string().min(24, "Invalid Site ID"),
  }),
});

export const resumeSyncSchema = z.object({
  body: z.object({
    siteId: z.string().min(24, "Invalid Site ID"),
    source: z.enum(['ga4', 'gsc', 'google-ads', 'facebook-ads']),
  }),
});
