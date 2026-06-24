(function () {
  const body = document.body;
  const root = document.getElementById('portal-root');
  if (!body || !root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  const safeText = (value) => {
    if (value == null) {
      return '';
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const trustLabel = (tier) => {
    if (tier === 'TIER_1_ENTER_EVERY_TIME') {
      return 'Tier 1 · Enter credentials each launch';
    }
    if (tier === 'TIER_2_CACHED_SESSION') {
      return 'Tier 2 · Keep cached session';
    }
    return 'Tier 3 · Stored registry';
  };

  const normalizeCarrierToken = (value) => {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const themeAliasByName = {
    cna: 'carrier-cna',
    'the-hartford': 'carrier-hartford',
    travelers: 'carrier-travelers',
    'monoline-work-comp': 'carrier-monoline',
    'amn-aflac': 'carrier-aman',
    'liberty-mutual': 'carrier-liberty',
    'state-farm': 'carrier-statefarm',
    hiscox: 'carrier-hiscox',
    'berkshire-hathaway': 'carrier-berkshire',
    chubb: 'carrier-chubb',
    'endeavor-business-solutions': 'carrier-endeavor',
    'axiom-risk': 'carrier-axiom',
  };

  const resolveThemeCarrierId = (candidate, nameHint, pathname) => {
    const direct = String(candidate || '').trim();
    if (carrierThemeMap[direct]) {
      return direct;
    }

    const prefixed = direct.startsWith('carrier-') ? direct : direct ? `carrier-${normalizeCarrierToken(direct)}` : '';
    if (prefixed && carrierThemeMap[prefixed]) {
      return prefixed;
    }

    const fromPath = String(pathname || '').match(/carrier-([a-z0-9-]+)\.html$/i);
    if (fromPath && carrierThemeMap[`carrier-${fromPath[1].toLowerCase()}`]) {
      return `carrier-${fromPath[1].toLowerCase()}`;
    }

    const normalizedName = normalizeCarrierToken(nameHint);
    return themeAliasByName[normalizedName] || '';
  };

  const carrierThemeMap = {
    'carrier-cna': {
      themeId: 'cna',
      accentColor: '#0068b4',
      portalTitle: 'CNA Agent Center',
      logoText: 'CNA',
      heroTagline: 'Commercial insurance, carriers, and account operations.',
      signInCopy: 'Sign in to CNA',
      quickActionsTitle: 'CNA quick actions',
      quickActions: ['Policy administration', 'Billing center', 'Claims queue'],
      dashboardCards: [
        { value: '24', label: 'Active policies', trend: '+4' },
        { value: '9', label: 'Pending quotes', trend: '2 review' },
        { value: '3', label: 'Open claims', trend: '2 in progress' },
        { value: '12', label: 'Renewals this month', trend: 'Active' },
      ],
      navItems: ['Home', 'Policies', 'Quotes', 'Claims', 'Reports', 'Admin'],
      dashboardTitle: 'CNA account status',
      activityLines: [
        'Policy #WC-4821 renewed with premium adjustment',
        'Quote #GL-1193 submitted for underwriting',
        'Claim #AU-772 status updated',
      ],
      statusHint: 'This mock mirrors a CNA-like agent center with guided action cards.',
      portalBackground: 'linear-gradient(140deg, #eaf4ff 0%, #f6fbff 60%, #f0f6ff 100%)',
      portalFont: '"Merriweather", Georgia, serif',
      cardSurface: '#f8fbff',
    },
    'carrier-hartford': {
      themeId: 'hartford',
      accentColor: '#0e4ba8',
      portalTitle: 'The Hartford Broker Gateway',
      logoText: 'H',
      heroTagline: 'Federated identity launch with broker-level controls.',
      signInCopy: 'Authenticate with Hartford',
      quickActionsTitle: 'Hartford workflow',
      quickActions: ['New business', 'SLA uploads', 'Identity checks'],
      dashboardCards: [
        { value: '11', label: 'Active accounts', trend: '+1' },
        { value: '27', label: 'Open opportunities', trend: '6 pending' },
        { value: '3', label: 'Expiring policies', trend: '2 soon' },
        { value: '6', label: 'Tasks in queue', trend: 'Broker action' },
      ],
      navItems: ['Dashboard', 'Accounts', 'Opportunities', 'Documents', 'SLA', 'Admin'],
      dashboardTitle: 'Hartford carrier workspace',
      activityLines: ['Carrier identity handshake completed', 'Account reassignments queued', 'Role matrix refresh run'],
      statusHint: 'This portal mock follows a SSO-first Hartford-style workflow.',
      portalBackground: 'linear-gradient(150deg, #edf2ff 0%, #f7faff 60%, #eef5ff 100%)',
      portalFont: '"Avenir Next", "Segoe UI", Arial, sans-serif',
      cardSurface: '#f5f9ff',
    },
    'carrier-travelers': {
      themeId: 'travelers',
      accentColor: '#007a53',
      portalTitle: 'Travelers Agent Portal',
      logoText: 'T',
      heroTagline: 'Email-code driven login with policy workflows.',
      signInCopy: 'Continue to Travelers',
      quickActionsTitle: 'Travelers tools',
      quickActions: ['Carrier forms', 'Case status', 'Policy search'],
      dashboardCards: [
        { value: '31', label: 'Active quotes', trend: '8 new' },
        { value: '59', label: 'Carrier users', trend: 'Awaiting review' },
        { value: '4', label: 'Pending approvals', trend: 'Escalation queue' },
        { value: '$74k', label: 'Open premium', trend: 'Needs attention' },
      ],
      navItems: ['Home', 'Policy Center', 'Quoting', 'Claims', 'Billing', 'Settings'],
      dashboardTitle: 'Travelers operations',
      activityLines: ['Email OTP code sent to broker', 'Quote #TA-2217 to underwriting', 'Auto-renewal batch scheduled'],
      statusHint: 'This mock keeps the Travelers login and case context together.',
      portalBackground: 'linear-gradient(160deg, #e5fff0 0%, #f4fffb 55%, #f0f9f4 100%)',
      portalFont: 'Roboto, Arial, sans-serif',
      cardSurface: '#f5fffa',
    },
    'carrier-monoline': {
      themeId: 'monoline',
      accentColor: '#6a3db0',
      portalTitle: 'Monoline Work Comp',
      logoText: 'MWC',
      heroTagline: 'Guided work-comp flow with practical admin checkpoints.',
      signInCopy: 'Sign in to Monoline Work Comp',
      quickActionsTitle: 'Monoline tasks',
      quickActions: ['Employer roster', 'Loss runs', 'COI requests'],
      dashboardCards: [
        { value: '14', label: 'Open files', trend: '4 due today' },
        { value: '20', label: 'Active users', trend: 'No stale sessions' },
        { value: '5', label: 'COI requests', trend: 'Awaiting signatures' },
        { value: '8', label: 'Policy updates', trend: '24h' },
      ],
      navItems: ['Home', 'Employers', 'Placements', 'Claims', 'Loss history', 'Admin'],
      dashboardTitle: 'Monoline work-comp workspace',
      activityLines: ['Manual checkpoint advanced to admin', 'Employer profile synced', 'Loss run exported for file #WCM-882'],
      statusHint: 'Monoline style uses compact controls with manual-style flow.',
      portalBackground: 'linear-gradient(145deg, #f2ecff 0%, #f9f7ff 55%, #f2f0fd 100%)',
      portalFont: '"Segoe UI", Arial, sans-serif',
      cardSurface: '#faf8ff',
    },
    'carrier-aman': {
      themeId: 'aman',
      accentColor: '#0044b8',
      portalTitle: 'AMN (AFLAC)',
      logoText: 'AMN',
      heroTagline: 'OAuth handoff flow with managed identity.',
      signInCopy: 'Continue with OAuth',
      quickActionsTitle: 'AFLAC entry points',
      quickActions: ['Broker SSO status', 'Policy admin', 'Compliance center'],
      dashboardCards: [
        { value: '26', label: 'Linked users', trend: '3 onboarded' },
        { value: '4', label: 'SSO refreshes', trend: 'Scheduled' },
        { value: '18', label: 'Pending grants', trend: 'Review needed' },
        { value: '3', label: 'Open incidents', trend: 'Acknowledged' },
      ],
      navItems: ['Home', 'Programs', 'Broker Services', 'Security', 'Reports', 'Support'],
      dashboardTitle: 'AFLAC identity workspace',
      activityLines: ['OAuth redirect complete', 'Identity token check passed', 'Grant list refreshed'],
      statusHint: 'OAuth-style mock with identity-first navigation.',
      portalBackground: 'linear-gradient(140deg, #ebf0ff 0%, #f6f9ff 60%, #eef4ff 100%)',
      portalFont: '"Roboto Slab", Georgia, serif',
      cardSurface: '#f6f9ff',
    },
    'carrier-liberty': {
      themeId: 'liberty',
      accentColor: '#0078be',
      portalTitle: 'Liberty Mutual',
      logoText: 'LM',
      heroTagline: 'Stable guided flow for underwriting and renewals.',
      signInCopy: 'Launch Liberty portal',
      quickActionsTitle: 'Liberty actions',
      quickActions: ['Renewal tracker', 'Role manager', 'Claims queue'],
      dashboardCards: [
        { value: '44', label: 'Current applications', trend: '9 in review' },
        { value: '11', label: 'Renewals this week', trend: '7 needed' },
        { value: '16', label: 'Open tickets', trend: 'Carrier team owns 10' },
        { value: '$210k', label: 'Premium at risk', trend: 'Monitor' },
      ],
      navItems: ['Home', 'Accounts', 'Risk center', 'Claims', 'Reports', 'Admin'],
      dashboardTitle: 'Liberty Mutual workspace',
      activityLines: ['Role matrix update queued', 'Renewal window opened', 'Claims details updated'],
      statusHint: 'Guided portal style focused on stability and consistency.',
      portalBackground: 'linear-gradient(150deg, #e8f6ff 0%, #f3fbff 60%, #ecf7ff 100%)',
      portalFont: 'Arial, "Helvetica Neue", sans-serif',
      cardSurface: '#f6fbff',
    },
    'carrier-statefarm': {
      themeId: 'statefarm',
      accentColor: '#0057a7',
      portalTitle: 'State Farm',
      logoText: 'SF',
      heroTagline: 'Phone-code broker flow for legacy-style tasks.',
      signInCopy: 'Continue with SMS code',
      quickActionsTitle: 'State Farm operations',
      quickActions: ['Legacy team tools', 'SMS audit', 'Carrier guidance'],
      dashboardCards: [
        { value: '37', label: 'Managed users', trend: 'Healthy' },
        { value: '15', label: 'Open renewals', trend: '3 expiring' },
        { value: '5', label: 'SMS prompts', trend: 'Used today' },
        { value: '22', label: 'Compliance checks', trend: 'No exceptions' },
      ],
      navItems: ['Home', 'Accounts', 'Claims', 'Commissions', 'Docs', 'Audit'],
      dashboardTitle: 'State Farm manual workspace',
      activityLines: ['SMS challenge delivered', 'Manual admin workflow prepared', 'Legacy view rendered'],
      statusHint: 'This reflects a phone-code onboarding flow used by legacy carriers.',
      portalBackground: 'linear-gradient(155deg, #e8f1ff 0%, #f5f9ff 60%, #eff6ff 100%)',
      portalFont: 'Lato, "Segoe UI", Arial, sans-serif',
      cardSurface: '#f4f8ff',
    },
    'carrier-hiscox': {
      themeId: 'hiscox',
      accentColor: '#0b3f84',
      portalTitle: 'Hiscox',
      logoText: 'H',
      heroTagline: 'Long-tail workflow with compact legacy controls.',
      signInCopy: 'Sign in to Hiscox',
      quickActionsTitle: 'Hiscox quick links',
      quickActions: ['Producer portal', 'Admin docs', 'Evidence packs'],
      dashboardCards: [
        { value: '9', label: 'Open files', trend: '5 due' },
        { value: '12', label: 'Queued forms', trend: 'Upload required' },
        { value: '3', label: 'Open tickets', trend: 'Follow-up' },
        { value: '2', label: 'Compliance tasks', trend: 'Review' },
      ],
      navItems: ['Home', 'Producers', 'Policies', 'Documents', 'Claims', 'Exit'],
      dashboardTitle: 'Hiscox activity',
      activityLines: ['Manual support request filed', 'Role confirmation complete', 'Evidence log appended'],
      statusHint: 'Compact legacy-style view with evidence-aware actions.',
      portalBackground: 'linear-gradient(150deg, #edf0ff 0%, #f5f6fd 55%, #eceefa 100%)',
      portalFont: 'Tahoma, Arial, sans-serif',
      cardSurface: '#f5f7ff',
    },
    'carrier-berkshire': {
      themeId: 'berkshire',
      accentColor: '#00635b',
      portalTitle: 'Berkshire Hathaway',
      logoText: 'BH',
      heroTagline: 'Broker continuity with evidence checkpoints.',
      signInCopy: 'Open Berkshire portal',
      quickActionsTitle: 'Berkshire controls',
      quickActions: ['Admin continuity', 'Carrier forms', 'Audit trail'],
      dashboardCards: [
        { value: '2', label: 'Primary admins', trend: 'Verified' },
        { value: '8', label: 'Backup users', trend: 'Ready' },
        { value: '6', label: 'Open actions', trend: 'Acknowledged' },
        { value: '95%', label: 'Audit completion', trend: 'Stable' },
      ],
      navItems: ['Dashboard', 'Admin', 'Evidence', 'Tasks', 'Reports', 'SLA'],
      dashboardTitle: 'Berkshire broker workspace',
      activityLines: ['Continuity check passed', 'Evidence artifact created', 'Role mapping validated'],
      statusHint: 'Continuity-focused layout with admin-first workflow.',
      portalBackground: 'linear-gradient(160deg, #e8faf6 0%, #f4fffc 60%, #ebfbf8 100%)',
      portalFont: 'Georgia, "Times New Roman", serif',
      cardSurface: '#f3fffc',
    },
    'carrier-chubb': {
      themeId: 'chubb',
      accentColor: '#7b2f8a',
      portalTitle: 'Chubb',
      logoText: 'C',
      heroTagline: 'Email-code and email workflow-driven access.',
      signInCopy: 'Verify Chubb code',
      quickActionsTitle: 'Chubb operations',
      quickActions: ['Email onboarding', 'Underwriting desk', 'Claims inbox'],
      dashboardCards: [
        { value: '26', label: 'Requests submitted', trend: '11 reviewed' },
        { value: '15', label: 'Open tickets', trend: 'Follow-up needed' },
        { value: '7', label: 'Forms sent', trend: 'Await signatures' },
        { value: '12', label: 'Claims alerts', trend: 'No escalation' },
      ],
      navItems: ['Home', 'Mailbox', 'Underwriting', 'Compliance', 'Tasks', 'Reports'],
      dashboardTitle: 'Chubb communication dashboard',
      activityLines: ['Verification email sent', 'Code validated', 'Packet archive synced'],
      statusHint: 'Email-code flow with a communication-centric dashboard.',
      portalBackground: 'linear-gradient(150deg, #f4eafe 0%, #fbf7ff 55%, #f6efff 100%)',
      portalFont: 'Montserrat, "Segoe UI", Arial, sans-serif',
      cardSurface: '#fbf8ff',
    },
    'carrier-endeavor': {
      themeId: 'endeavor',
      accentColor: '#355e9d',
      portalTitle: 'Endeavor Business Solutions',
      logoText: 'EB',
      heroTagline: 'Federated identity with guided task progression.',
      signInCopy: 'Start Endeavor SSO',
      quickActionsTitle: 'Endeavor shortcuts',
      quickActions: ['SSO diagnostics', 'Role sync', 'Task review'],
      dashboardCards: [
        { value: '21', label: 'API-linked users', trend: '3 modified' },
        { value: '1', label: 'Open session', trend: 'Healthy' },
        { value: '9', label: 'Approvals', trend: 'Pending' },
        { value: '16', label: 'Policy updates', trend: 'Draft mode' },
      ],
      navItems: ['Home', 'Identity', 'Accounts', 'Requests', 'Approvals', 'Reports'],
      dashboardTitle: 'Endeavor identity dashboard',
      activityLines: ['SSO assertion accepted', 'Identity sync verified', 'Approval workflow advanced'],
      statusHint: 'Federated model with guided access state and approvals.',
      portalBackground: 'linear-gradient(155deg, #e8f0ff 0%, #f4f8ff 58%, #edf5ff 100%)',
      portalFont: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      cardSurface: '#f4f8ff',
    },
    'carrier-axiom': {
      themeId: 'axiom',
      accentColor: '#f08a2f',
      portalTitle: 'Axiom Risk',
      logoText: 'AR',
      heroTagline: 'Legacy workflow with practical admin controls.',
      signInCopy: 'Sign in to Axiom',
      quickActionsTitle: 'Axiom admin tools',
      quickActions: ['Policy lookup', 'Carrier messaging', 'Audit reminders'],
      dashboardCards: [
        { value: '8', label: 'Open policies', trend: 'Stable' },
        { value: '24', label: 'Support tasks', trend: 'Broker-assisted' },
        { value: '4', label: 'Outstanding mails', trend: 'Awaiting response' },
        { value: '100%', label: 'MFA relay', trend: 'Completed' },
      ],
      navItems: ['Home', 'Policies', 'Underwriting', 'Compliance', 'Messaging', 'Exit'],
      dashboardTitle: 'Axiom workspace',
      activityLines: ['Legacy admin workflow complete', 'Carrier ticket created', 'Evidence export prepared'],
      statusHint: 'A compact layout that resembles an older producer-style portal.',
      portalBackground: 'linear-gradient(150deg, #fff2df 0%, #fff8ee 55%, #fff3dc 100%)',
      portalFont: '"Trebuchet MS", Arial, sans-serif',
      cardSurface: '#fff8ea',
    },
  };

  const defaultTheme = {
    themeId: 'generic',
    accentColor: body.dataset.brandColor || '#2e3ea0',
    portalTitle: 'Carrier portal',
    logoText: 'P',
    heroTagline: 'Simulated portal used by the POC for launch-flow validation.',
    quickActionsTitle: 'Quick actions',
    quickActions: ['Open help', 'Carrier notes', 'Support contacts'],
    dashboardCards: [
      { value: '24', label: 'Active policies', trend: 'Demo data' },
      { value: '7', label: 'Pending quotes', trend: 'Demo data' },
      { value: '3', label: 'Open claims', trend: 'Demo data' },
      { value: '12', label: 'Renewals this month', trend: 'Demo data' },
    ],
    navItems: ['Home', 'Policies', 'Claims', 'Reports', 'Support'],
    dashboardTitle: 'Carrier dashboard',
    activityLines: ['Mock launch completed', 'Session updated', 'Status checkpoint passed'],
    statusHint: 'Simulated workflow only. No external carrier systems are used.',
    portalBackground: 'linear-gradient(140deg, #edf3fb 0%, #f8fcff 55%, #f2f4fa 100%)',
    portalFont: '"Poppins", "Segoe UI", Arial, sans-serif',
    cardSurface: '#ffffff',
  };

  const landingChromeDefaults = {
    utilityBg: '#143455',
    utilityText: '#ffffff',
    utilityLink: '#c5daff',
    mainNavBg: '#ffffff',
    mainNavText: '#12304f',
    navHover: '#edf4ff',
    accent: '#0a63be',
    pageBg: 'linear-gradient(140deg, #eaf2ff 0%, #f6faff 55%, #eef4ff 100%)',
    heroBg: 'linear-gradient(125deg, #ffffff 0%, #f2f7fe 42%, #edf5ff 100%)',
    heroPanel: 'linear-gradient(130deg, #0b64c0 0%, #31a6f7 58%, #8ad2ff 100%)',
    heroPanelText: '#ffffff',
    cardBg: '#ffffff',
    cardBorder: '#d7e4f2',
    cardShadow: '0 16px 36px -30px rgba(19, 48, 74, 0.5)',
    footerBg: '#f4f8fc',
    sectionColumns: 'repeat(4, minmax(220px, 1fr))',
    heroColumns: '1.35fr 0.95fr',
    font: '"Poppins", "Segoe UI", Arial, sans-serif',
  };

  const resolveCarrierLogoUrl = (rawUrl, explicitUrl) => {
    if (explicitUrl) {
      return explicitUrl;
    }
    if (!rawUrl) {
      return '';
    }
    try {
      const host = new URL(rawUrl).hostname.replace(/^www\./, '');
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=256`;
    } catch {
      return '';
    }
  };

  const landingProfileDefaults = {
    utilityLinks: ['About', 'Support', 'Careers', 'Contact', 'Search'],
    topNav: ['Home', 'Products', 'Claims', 'Billing', 'Resources', 'Help'],
    heroKicker: 'Carrier portal',
    heroHeadline: 'Broker workspace',
    heroSubheadline: 'This landing page is mocked to mirror the carrier launch surface before authentication.',
    heroImageText: 'Demo portal',
    infoSections: [
      {
        title: 'Popular resources',
        items: ['Carrier updates', 'Claims filing', 'Policy tools', 'Billing guides'],
      },
      {
        title: 'Helpful links',
        items: ['Training center', 'Evidence checklist', 'SLA tracking'],
      },
    ],
    searchTitle: 'Search this portal',
    searchHint: 'Find quotes, forms, claims guidance, and broker tooling',
    footerLinks: ['Support', 'Contact', 'Privacy', 'Terms'],
    footerNote:
      'This is a mock portal façade generated from seeded carrier context. The live login form is intentionally suppressed to display a stable landing state.',
    chrome: landingChromeDefaults,
    logoSource: '',
  };

  const landingProfiles = {
    'carrier-cna': {
      utilityLinks: ['About CNA', 'Careers', 'Investor Relations', 'Pay My Bill', 'Contact', 'Search'],
      topNav: ['Industries', 'Products & Solutions', 'Risk Control', 'Claims Center', 'Find An Agent', 'Agent Login'],
      heroKicker: 'CNA Agent Center',
      heroHeadline: 'Quote, Bind and More on CNA Central',
      heroSubheadline: 'Helping your clients has never been easier.',
      heroImageText: 'Commercial insurance, employers, and risk services.',
      infoSections: [
        {
          title: 'CNA quick links',
          items: ['CNA Central', 'Claims Center', 'Broker training', 'Pay My Bill'],
        },
        {
          title: 'Industry tools',
          items: ['Policy renewals', 'Claims guidance', 'Underwriting support', 'Forms hub'],
        },
      ],
      searchTitle: 'Search CNA Central',
      searchHint: 'Search policies, claims guidance, and training resources',
      footerLinks: ['Cookie Notice', 'Privacy', 'Contact CNA'],
      footerNote: 'CNA landing simulation with the same top utility + agent-centered resource layout.',
      logoSource: 'https://www.google.com/s2/favicons?domain=cna.com&sz=256',
      chrome: {
        utilityBg: '#063f4e',
        utilityLink: '#d0ecff',
        accent: '#b91e30',
        heroPanel: 'linear-gradient(130deg, #b51a33 0%, #d33b4f 55%, #f08c99 100%)',
        sectionColumns: 'repeat(4, minmax(220px, 1fr))',
        heroColumns: '1.45fr 0.95fr',
        font: '"Merriweather", Georgia, serif',
      },
    },
    'carrier-hartford': {
      utilityLinks: ['Home', 'Products', 'Broker Login', 'Claims', 'Training', 'Contact'],
      topNav: ['Agents', 'Businesses', 'Solutions', 'Claims Center', 'Documents', 'Logout'],
      heroKicker: 'The Hartford',
      heroHeadline: 'Welcome to Hartford Producer and Broker Gateway',
      heroSubheadline: 'A unified landing state for managed account workflows and policy support.',
      heroImageText: 'Secure producer services',
      infoSections: [
        {
          title: 'Navigation hub',
          items: ['SSO status', 'Account onboarding', 'Task queue', 'Role access'],
        },
        {
          title: 'Carrier updates',
          items: ['Policy notices', 'SLA documentation', 'Claims best practices'],
        },
      ],
      searchTitle: 'Search Hartford help',
      searchHint: 'Search managed policies, SSO docs, and support pages',
      footerNote: 'Hartford facade with a clean utility strip and dense top navigation.',
      logoSource: 'https://www.google.com/s2/favicons?domain=thehartford.com&sz=256',
      footerLinks: ['Support Center', 'Accessibility', 'Privacy', 'Site status'],
      chrome: {
        utilityBg: '#082c57',
        utilityLink: '#9fc7ff',
        accent: '#0e4ba8',
        heroBg: 'linear-gradient(130deg, #f3f8ff 0%, #f7fbff 55%, #eaf2ff 100%)',
        pageBg: 'linear-gradient(150deg, #edf3ff 0%, #f6f9ff 60%, #ecf4ff 100%)',
        sectionColumns: 'repeat(3, minmax(220px, 1fr))',
        font: '"Avenir Next", "Segoe UI", Arial, sans-serif',
      },
    },
    'carrier-travelers': {
      utilityLinks: ['Travelers', 'Business Owners', 'Contact', 'News', 'Search'],
      topNav: ['Home', 'Policy', 'Quoting', 'Claims', 'Billing', 'Tools'],
      heroKicker: 'Travelers',
      heroHeadline: 'Agent portal for commercial and business solutions',
      heroSubheadline: 'Green-toned agent-focused layout for case status, quotes, and policy management.',
      heroImageText: 'Claims + quoting workflows',
      infoSections: [
        {
          title: 'Tools',
          items: ['Carrier forms', 'Case status', 'Policy search'],
        },
        {
          title: 'Resources',
          items: ['Underwriting contacts', 'Premium summaries', 'Policy change requests'],
        },
      ],
      searchTitle: 'Search Travelers',
      searchHint: 'Search policy workflows, claims status, and production tools',
      footerNote: 'Travelers page emulates a broad commercial-agent landing with dedicated tools and case resources.',
      logoSource: 'https://www.google.com/s2/favicons?domain=travelers.com&sz=256',
      footerLinks: ['Search', 'Help Desk', 'Agent resources', 'Terms'],
      chrome: {
        utilityBg: '#07361f',
        utilityLink: '#bbf1c7',
        accent: '#0a8a4f',
        heroPanel: 'linear-gradient(130deg, #0f7f59 0%, #2eaa78 58%, #a8f2ce 100%)',
        pageBg: 'linear-gradient(135deg, #ebfff4 0%, #f7fffc 48%, #f4fbf7 100%)',
        font: '"Lora", Georgia, serif',
      },
    },
    'carrier-monoline': {
      utilityLinks: ['Agent Login', 'Claims', 'Loss Runs', 'Training', 'Contact'],
      topNav: ['Home', 'Employers', 'Placements', 'Claims', 'Loss history', 'Admin'],
      heroKicker: 'Monoline Work Comp',
      heroHeadline: 'Work-comp producer portal',
      heroSubheadline: 'Compact panel layout for employer-facing workflows and continuity tasks.',
      heroImageText: 'Employer and loss-tracking tools',
      infoSections: [
        {
          title: 'Employer workflow',
          items: ['Employer roster', 'Loss run export', 'COI requests'],
        },
        {
          title: 'Carrier help',
          items: ['Documentation', 'Carrier forms', 'Policy operations'],
        },
      ],
      searchTitle: 'Search Monoline',
      searchHint: 'Search policies, employer files, and loss-run tools',
      footerNote: 'Monoline mimic uses compact cards and compact utility links for producer clarity.',
      logoSource: 'https://www.google.com/s2/favicons?domain=argogroup.com&sz=256',
      footerLinks: ['Loss guidance', 'Employer support', 'Security', 'Contact'],
      chrome: {
        utilityBg: '#3f2762',
        utilityLink: '#d6d6ff',
        accent: '#6a3db0',
        heroBg: 'linear-gradient(130deg, #f7f3ff 0%, #fbfaff 58%, #efeafc 100%)',
        heroPanel: 'linear-gradient(130deg, #5a30a4 0%, #7f5ec4 55%, #b9a4e8 100%)',
        sectionColumns: 'repeat(3, minmax(200px, 1fr))',
        font: '"Nunito", Tahoma, sans-serif',
      },
    },
    'carrier-aman': {
      utilityLinks: ['AMN', 'Identity', 'Claims', 'Compliance', 'Resources', 'Contact'],
      topNav: ['Home', 'Programs', 'Broker Services', 'Security', 'Reports', 'Support'],
      heroKicker: 'AMN (AFLAC) identity portal',
      heroHeadline: 'OAuth-enabled producer entrance',
      heroSubheadline: 'Identity-first layout with a circular brand mark and identity status panel.',
      heroImageText: 'OAuth identity gateway',
      infoSections: [
        {
          title: 'Broker operations',
          items: ['Policy admin', 'Compliance center', 'Provider roles'],
        },
        {
          title: 'Support links',
          items: ['SSO status', 'Audit trail', 'Help center'],
        },
      ],
      searchTitle: 'Search AMN',
      searchHint: 'Search identity events, policy administration, and forms',
      footerNote: 'AMN view emphasizes identity and compliance with a balanced split hero.',
      logoSource: 'https://www.google.com/s2/favicons?domain=argolimited.com&sz=256',
      footerLinks: ['OAuth docs', 'Compliance', 'Contact', 'Status'],
      chrome: {
        utilityBg: '#03357a',
        utilityLink: '#c8d9ff',
        accent: '#0044b8',
        heroPanel: 'linear-gradient(130deg, #002f73 0%, #0058b8 58%, #4eb3ff 100%)',
        pageBg: 'linear-gradient(140deg, #eff4ff 0%, #f8fbff 60%, #edf4ff 100%)',
        heroColumns: '1.2fr 1fr',
        sectionColumns: 'repeat(3, minmax(200px, 1fr))',
        font: '"Montserrat", "Segoe UI", Arial, sans-serif',
      },
    },
    'carrier-liberty': {
      utilityLinks: ['About Liberty', 'My account', 'Support', 'Claims', 'Search'],
      topNav: ['Home', 'Accounts', 'Risk center', 'Claims', 'Reports', 'Admin'],
      heroKicker: 'Liberty Mutual',
      heroHeadline: 'Commercial, workers comp, and renewals in one workspace',
      heroSubheadline: 'Wide header style and bright card contrast with a production-like hero rhythm.',
      heroImageText: 'Underwriting and renewal desk',
      infoSections: [
        {
          title: 'Renewals',
          items: ['Renewal tracker', 'Rate updates', 'Expiration alerts'],
        },
        {
          title: 'Services',
          items: ['Claims queue', 'Role manager', 'Risk center'],
        },
      ],
      searchTitle: 'Search Liberty Mutual',
      searchHint: 'Search renewals, claims status, and reporting files',
      footerNote: 'Liberty profile uses a broad top navigation and high-contrast hero card treatment.',
      logoSource: 'https://www.google.com/s2/favicons?domain=libertymutual.com&sz=256',
      footerLinks: ['Broker support', 'Data privacy', 'Claims help', 'Terms'],
      chrome: {
        utilityBg: '#003b67',
        utilityLink: '#bbdefe',
        accent: '#0078be',
        heroPanel: 'linear-gradient(130deg, #0078be 0%, #005da1 58%, #1a95e0 100%)',
        pageBg: 'linear-gradient(140deg, #f3f7fb 0%, #f8fbff 50%, #f1f9ff 100%)',
        cardBorder: '#cad6df',
        sectionColumns: 'repeat(4, minmax(210px, 1fr))',
        font: '"Helvetica Neue", Arial, sans-serif',
      },
    },
    'carrier-statefarm': {
      utilityLinks: ['State Farm', 'Claims', 'Billing', 'Commissions', 'Contact', 'Search'],
      topNav: ['Home', 'Accounts', 'Claims', 'Commissions', 'Docs', 'Audit'],
      heroKicker: 'State Farm',
      heroHeadline: 'Legacy carrier portal state with practical broker cards',
      heroSubheadline: 'Bold accents and compact top controls for continuity-oriented agency teams.',
      heroImageText: 'Agent continuity and verification status',
      infoSections: [
        {
          title: 'Verification',
          items: ['SMS audit', 'Legacy workflow view', 'Carrier guidance'],
        },
        {
          title: 'Work desk',
          items: ['Open renewals', 'Managed users', 'Docs in review'],
        },
      ],
      searchTitle: 'Search State Farm',
      searchHint: 'Search carriers notes, renewals, and policy tools',
      footerNote: 'State Farm façade keeps a restrained, legacy-style content stack and strong accent lines.',
      logoSource: 'https://www.google.com/s2/favicons?domain=statefarm.com&sz=256',
      footerLinks: ['Broker desk', 'Forms', 'Contact support', 'Policy help'],
      chrome: {
        utilityBg: '#0b2d5b',
        utilityLink: '#e4d3ff',
        accent: '#d71920',
        heroBg: 'linear-gradient(130deg, #f6f8fa 0%, #f9fbfd 54%, #edf4ff 100%)',
        heroPanel: 'linear-gradient(130deg, #d71920 0%, #ff7d85 58%, #ffc7ca 100%)',
        cardBorder: '#dad9e5',
        pageBg: 'linear-gradient(150deg, #f5f6f8 0%, #fafbfe 60%, #f4f8ff 100%)',
        sectionColumns: 'repeat(3, minmax(220px, 1fr))',
        font: '"Lato", "Segoe UI", Arial, sans-serif',
      },
    },
    'carrier-hiscox': {
      utilityLinks: ['Hiscox', 'Services', 'Contact', 'Support', 'Search'],
      topNav: ['Home', 'Producers', 'Policies', 'Documents', 'Claims', 'Support'],
      heroKicker: 'Hiscox Producer Portal',
      heroHeadline: 'Insurance resources for specialist production teams',
      heroSubheadline: 'Muted contrast and old-style carding to reflect a classic producer portal tone.',
      heroImageText: 'Producer evidence and documents',
      infoSections: [
        {
          title: 'Core tasks',
          items: ['Policy lookup', 'Document requests', 'Claims filing'],
        },
        {
          title: 'Evidence support',
          items: ['Evidence packs', 'Admin docs', 'COI assistance'],
        },
      ],
      searchTitle: 'Search Hiscox',
      searchHint: 'Search documents, forms, and broker support topics',
      footerNote: 'Hiscox façade uses compact panels and muted cream accents on a legacy-inspired shell.',
      logoSource: 'https://www.google.com/s2/favicons?domain=hiscox.com&sz=256',
      footerLinks: ['Support', 'Document library', 'Contact', 'Sitemap'],
      chrome: {
        utilityBg: '#0b284a',
        utilityLink: '#d9d7ff',
        accent: '#0b3f84',
        heroBg: 'linear-gradient(130deg, #f8f6ef 0%, #f5f3eb 54%, #f4f0e6 100%)',
        heroPanel: 'linear-gradient(130deg, #0b3f84 0%, #274f8c 58%, #7ca0d6 100%)',
        pageBg: 'linear-gradient(150deg, #f6efe4 0%, #f9f4ed 50%, #f4efe4 100%)',
        sectionColumns: 'repeat(3, minmax(210px, 1fr))',
        font: '"Open Sans", "Helvetica", sans-serif',
      },
    },
    'carrier-berkshire': {
      utilityLinks: ['Berkshire', 'Governance', 'Contact', 'Sitemap', 'Search'],
      topNav: ['Dashboard', 'Admin', 'Evidence', 'Tasks', 'Reports', 'SLA'],
      heroKicker: 'Berkshire Hathaway',
      heroHeadline: 'Broker continuity and admin governance hub',
      heroSubheadline: 'Layered sections, continuity focus, and evidence-first messaging.',
      heroImageText: 'Continuity status and admin controls',
      infoSections: [
        {
          title: 'Governance',
          items: ['Admin continuity', 'Evidence trail', 'Role mapping'],
        },
        {
          title: 'Operations',
          items: ['Carrier forms', 'Audit artifacts', 'Policy actions'],
        },
      ],
      searchTitle: 'Search Berkshire',
      searchHint: 'Search audits, policy files, and continuity artifacts',
      footerNote: 'Berkshire design emphasizes continuity, evidence, and accountable admin operations.',
      logoSource: 'https://www.google.com/s2/favicons?domain=berkshirehathaway.com&sz=256',
      footerLinks: ['Continuity help', 'Evidence exports', 'Admin support', 'Privacy'],
      chrome: {
        utilityBg: '#014646',
        utilityLink: '#9ee6d5',
        accent: '#007a72',
        heroBg: 'linear-gradient(130deg, #eefcf8 0%, #f6fefb 54%, #f3fbf8 100%)',
        heroPanel: 'linear-gradient(130deg, #00635b 0%, #019083 58%, #65d0c0 100%)',
        pageBg: 'linear-gradient(145deg, #edf8f6 0%, #f4fbf9 52%, #ecf8f4 100%)',
        cardBorder: '#a7d8d0',
        sectionColumns: 'repeat(3, minmax(210px, 1fr))',
        font: '"Palatino Linotype", "Georgia", serif',
      },
    },
    'carrier-chubb': {
      utilityLinks: ['Chubb', 'Products', 'Support', 'Contact', 'Search'],
      topNav: ['Home', 'Mailbox', 'Underwriting', 'Compliance', 'Tasks', 'Reports'],
      heroKicker: 'Chubb Agent Center',
      heroHeadline: 'Communication-first producer landing page',
      heroSubheadline: 'Dark accent side panel with clear card hierarchy for case and underwriting actions.',
      heroImageText: 'Underwriting desk and communication lane',
      infoSections: [
        {
          title: 'Underwriting',
          items: ['Email onboarding', 'Mailbox queue', 'Form submissions'],
        },
        {
          title: 'Communication',
          items: ['Claims alerts', 'Compliance notices', 'Support case updates'],
        },
      ],
      searchTitle: 'Search Chubb',
      searchHint: 'Search inbox items, policies, and email-assisted workflows',
      footerNote: 'Chubb uses a darker content rail style paired with communication-focused resources.',
      logoSource: 'https://www.google.com/s2/favicons?domain=chubb.com&sz=256',
      footerLinks: ['Underwriting desk', 'Mailbox', 'Claims', 'Policy help'],
      chrome: {
        utilityBg: '#2d1f42',
        utilityLink: '#f5d0ff',
        accent: '#7b2f8a',
        heroBg: 'linear-gradient(130deg, #f7f3fb 0%, #fcf9ff 54%, #f3effb 100%)',
        heroPanel: 'linear-gradient(130deg, #7b2f8a 0%, #9b46a5 55%, #d5a9e8 100%)',
        cardShadow: '0 18px 42px -34px rgba(89, 34, 120, 0.6)',
        sectionColumns: 'repeat(3, minmax(220px, 1fr))',
        font: '"Nunito Sans", "Segoe UI", Arial, sans-serif',
      },
    },
    'carrier-endeavor': {
      utilityLinks: ['Endeavor', 'Identity', 'Claims', 'Docs', 'Support', 'Search'],
      topNav: ['Home', 'Identity', 'Accounts', 'Requests', 'Approvals', 'Reports'],
      heroKicker: 'Endeavor Business Solutions',
      heroHeadline: 'Federated identity landing state for partner workflows',
      heroSubheadline: 'Task-based layout with identity progression and approval lanes.',
      heroImageText: 'Role sync and task approval',
      infoSections: [
        {
          title: 'Task center',
          items: ['SSO diagnostics', 'Approvals', 'Request review'],
        },
        {
          title: 'Carrier services',
          items: ['Role sync', 'Identity status', 'Task handoff'],
        },
      ],
      searchTitle: 'Search Endeavor',
      searchHint: 'Search identity events, requests, and account tasks',
      footerNote: 'Endeavor shows a partner-operations style with identity-first controls.',
      logoSource: 'https://www.google.com/s2/favicons?domain=argolimited.com&sz=256',
      footerLinks: ['Identity center', 'Partner support', 'Task list', 'Contact'],
      chrome: {
        utilityBg: '#1b3a65',
        utilityLink: '#add4ff',
        accent: '#355e9d',
        heroBg: 'linear-gradient(130deg, #edf2ff 0%, #f4f8ff 54%, #edf6ff 100%)',
        heroPanel: 'linear-gradient(130deg, #355e9d 0%, #4c73b8 58%, #8eb5f0 100%)',
        pageBg: 'linear-gradient(140deg, #ecf2fb 0%, #f4f8ff 48%, #edf8ff 100%)',
        sectionColumns: 'repeat(4, minmax(190px, 1fr))',
        font: '"Source Sans Pro", "Trebuchet MS", sans-serif',
      },
    },
    'carrier-axiom': {
      utilityLinks: ['Axiom Risk', 'Legacy Access', 'Support', 'Resources', 'Search'],
      topNav: ['Home', 'Policies', 'Underwriting', 'Compliance', 'Messaging', 'Exit'],
      heroKicker: 'Axiom Risk',
      heroHeadline: 'Legacy-style producer portal with structured navigation',
      heroSubheadline: 'Classic panel rhythm and legacy card spacing for legacy systems with modern clarity.',
      heroImageText: 'Legacy producer operations',
      infoSections: [
        {
          title: 'Policy center',
          items: ['Policy lookup', 'Carrier messaging', 'Audit reminders'],
        },
        {
          title: 'Resources',
          items: ['Support tasks', 'Carrier forms', 'Legacy guides'],
        },
      ],
      searchTitle: 'Search Axiom',
      searchHint: 'Search policies, support tasks, and carrier messaging',
      footerNote: 'Axiom profile uses a flatter legacy structure with warm accents and dense utility spacing.',
      logoSource: 'https://www.google.com/s2/favicons?domain=axiomrisk.com&sz=256',
      footerLinks: ['Carrier messaging', 'Support docs', 'Legacy help', 'Privacy'],
      chrome: {
        utilityBg: '#6e4000',
        utilityLink: '#ffe6c2',
        accent: '#f08a2f',
        heroBg: 'linear-gradient(130deg, #fff8ec 0%, #fffaf3 54%, #fff2df 100%)',
        heroPanel: 'linear-gradient(130deg, #f08a2f 0%, #ffb95c 58%, #ffe4bf 100%)',
        heroPanelText: '#4c2e00',
        cardBorder: '#e5c59c',
        sectionColumns: 'repeat(3, minmax(220px, 1fr))',
        font: '"Trebuchet MS", "Gill Sans", sans-serif',
      },
    },
  };

  const context = {
    carrierId: params.get('carrierId') || body.dataset.carrierId || 'carrier-generic',
    themeCarrierId: params.get('themeId') || params.get('theme') || '',
    carrierName: params.get('carrierName') || body.dataset.carrierName || body.dataset.carrierDisplay || 'Carrier',
    liveUrl: params.get('liveUrl') || body.dataset.liveUrl || '',
    notes: params.get('notes') || body.dataset.portalNotes || '',
    authMechanism: params.get('authMechanism') || body.dataset.authMechanism || 'credentials',
    requiresMfa: params.get('requiresMfa') === 'true',
    mfaMethod: params.get('mfaMethod') || 'totp',
    userName: params.get('userName') || 'Demo user',
    userEmail: params.get('userEmail') || '',
    trustTier: params.get('trustTier') || 'TIER_2_CACHED_SESSION',
    cachedSession: params.get('cachedSession') === 'true',
    mfaSatisfied: params.get('mfaSatisfied') === 'true',
    username: params.get('username') || '',
    brandSigil: body.dataset.brandSigil || 'X',
  };

  const selectedThemeId = resolveThemeCarrierId(
    context.themeCarrierId || context.carrierId,
    context.carrierName,
    window.location.pathname,
  );

  const selected = selectedThemeId ? carrierThemeMap[selectedThemeId] || {} : {};
  const profileOverride = selectedThemeId ? landingProfiles[selectedThemeId] || {} : {};
  const safeNav = Array.isArray(profileOverride.topNav) && profileOverride.topNav.length ? profileOverride.topNav : defaultTheme.navItems;
  const theme = {
    ...defaultTheme,
    ...selected,
    portalFont: params.get('portalFont') || selected.portalFont || defaultTheme.portalFont,
    accentColor: body.dataset.brandColor || (selected.accentColor || defaultTheme.accentColor),
    logoText: selected.logoText || context.brandSigil,
    cardSurface: selected.cardSurface || defaultTheme.cardSurface,
  };

  const profile = {
    ...landingProfileDefaults,
    ...profileOverride,
    heroHeadline: profileOverride.heroHeadline || theme.portalTitle,
    heroSubheadline: profileOverride.heroSubheadline || theme.heroTagline,
    topNav: safeNav,
  };

  const chrome = {
    ...landingChromeDefaults,
    ...(defaultTheme.chrome || {}),
    ...(profile.chrome || {}),
    ...(selected.chrome || {}),
  };

  const statusItems = [
    trustLabel(context.trustTier),
    `Mechanism: ${context.authMechanism.replace('_', ' ')}`,
    `MFA: ${context.requiresMfa ? context.mfaMethod.toUpperCase() : 'Not required'}`,
  ];

  body.dataset.portalTheme = theme.themeId;
  body.dataset.authMechanism = context.authMechanism;
  body.style.setProperty('--carrier-color', theme.accentColor);
  body.style.setProperty('--portal-bg', chrome.pageBg || theme.portalBackground);
  body.style.setProperty('--portal-card-bg', theme.cardSurface || chrome.cardBg);
  body.style.setProperty('--portal-card-border', chrome.cardBorder || '#d4deeb');
  body.style.setProperty('--portal-font', chrome.font || theme.portalFont);
  body.style.setProperty('--landing-utility-bg', chrome.utilityBg);
  body.style.setProperty('--landing-utility-text', chrome.utilityText);
  body.style.setProperty('--landing-utility-link', chrome.utilityLink);
  body.style.setProperty('--landing-main-nav-bg', chrome.mainNavBg || '#ffffff');
  body.style.setProperty('--landing-main-nav-text', chrome.mainNavText || '#163457');
  body.style.setProperty('--landing-main-nav-hover', chrome.navHover || '#edf4ff');
  body.style.setProperty('--landing-accent', chrome.accent);
  body.style.setProperty('--landing-hero-bg', chrome.heroBg);
  body.style.setProperty('--landing-hero-panel', chrome.heroPanel);
  body.style.setProperty('--landing-hero-panel-text', chrome.heroPanelText);
  body.style.setProperty('--landing-footer-bg', chrome.footerBg || '#f2f7fc');
  body.style.setProperty('--landing-card-shadow', chrome.cardShadow || '0 16px 38px -32px rgba(12, 42, 84, 0.5)');
  body.style.setProperty('--landing-section-columns', chrome.sectionColumns);
  body.style.setProperty('--landing-hero-columns', chrome.heroColumns);
  body.style.setProperty('--landing-card-bg', chrome.cardBg || '#ffffff');

  const storageKey = `bb-mock-portal-session-${context.carrierId}`;
  const existingSession = (() => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();

  const existingUser = existingSession?.username ? `Last session actor ${existingSession.username}` : '';

  const carrierLogoUrl = resolveCarrierLogoUrl(context.liveUrl, profile.logoSource);

  const renderBrandMark = () => {
    const fallbackText = safeText(theme.logoText || 'P');
    if (!carrierLogoUrl) {
      return `<span class="landing-brand-mark is-text" data-logo-mark><span class="landing-brand-mark-fallback">${fallbackText}</span></span>`;
    }

    return `
      <span class="landing-brand-mark" data-logo-mark>
        <img class="landing-brand-mark-image" src="${safeText(carrierLogoUrl)}" alt="${fallbackText} logo" loading="lazy" />
        <span class="landing-brand-mark-fallback">${fallbackText}</span>
      </span>
    `;
  };

  const toList = (value) => {
    if (!Array.isArray(value)) return [];
    return value.filter(Boolean);
  };

  const renderList = (items) => {
    const list = toList(items);
    if (!list.length) {
      return '<li class="muted">No entries available.</li>';
    }
    return list.map((line) => `<li>${safeText(line)}</li>`).join('');
  };

  const renderPills = (items) => {
    return toList(items)
      .map((item) => `<span class="landing-pill">${safeText(item)}</span>`)
      .join('');
  };

  const renderLinks = (items, className = 'landing-inline') => {
    return toList(items)
      .map((item) => `<span class="${className}">${safeText(item)}</span>`)
      .join('');
  };

  const primaryActions = toList(theme.quickActions).length
    ? toList(theme.quickActions).slice(0, 5)
    : ['Policy lookup', 'Claims queue', 'Billing assistance'];
  const baseSections = [
    { title: profile.quickActionsTitle || theme.quickActionsTitle || 'Quick actions', items: primaryActions },
    ...toList(profile.infoSections),
    {
      title: 'Session context',
      items: [
        ...statusItems,
        existingUser || 'No previous local session cached in mock storage',
        `Trust tier: ${safeText(context.trustTier)}`,
        context.mfaSatisfied ? 'MFA relayed successfully by broker flow' : 'MFA handling delegated to app launch state',
      ],
    },
  ];

  const renderSection = (section) => {
    return `
      <article class="landing-card">
        <h2>${safeText(section.title || 'Section')}</h2>
        <ul class="landing-list">
          ${renderList(toList(section.items))}
        </ul>
      </article>
    `;
  };

  const sectionMarkup = toList(baseSections)
    .slice(0, 3)
    .map((section) => renderSection(section))
    .join('');

  const currentFooterNote = `${safeText(profile.footerNote)} ${safeText(context.notes || '')}`.trim();
  const heroCtaLabel = `Open live ${safeText(context.carrierName)} page`;

  root.innerHTML = `
    <div class="landing-shell">
      <section class="rpa-landing-overlay" data-rpa-overlay>
        <div class="rpa-landing-banner">
          <span class="rpa-pulse-dot" aria-hidden="true"></span>
          <strong>DataBraid RPA is preparing ${safeText(context.carrierName)}</strong>
          <span data-rpa-status>Opening carrier session</span>
        </div>
        <div class="rpa-landing-steps" data-rpa-steps aria-live="polite"></div>
      </section>

      <section class="landing-utility-bar">
        <div class="landing-utility-links">
          ${renderPills(profile.utilityLinks)}
        </div>
        <div class="landing-utility-links">
          ${renderPills(['Demo mode', safeText(context.trustTier), safeText(context.authMechanism)])}
        </div>
      </section>

      <header class="landing-main-header">
        <a class="landing-brand" href="#" aria-label="${safeText(theme.portalTitle)} home">
          ${renderBrandMark()}
          <span class="landing-brand-text">
            <strong>${safeText(context.carrierName)}</strong>
            <small>${safeText(theme.heroTagline)}</small>
          </span>
        </a>
        <nav class="landing-main-nav" aria-label="${safeText(theme.portalTitle)} links">
          ${renderLinks(profile.topNav, 'landing-nav-link')}
        </nav>
      </header>

      <section class="landing-hero">
        <article class="landing-hero-content">
          <p class="landing-kicker">${safeText(profile.heroKicker)}</p>
          <h1>${safeText(profile.heroHeadline)}</h1>
          <p class="landing-subtitle">${safeText(profile.heroSubheadline)}</p>
          <div class="landing-hero-actions">
            ${context.liveUrl ? `<a class="landing-button" href="${safeText(context.liveUrl)}" target="_blank" rel="noopener noreferrer">${heroCtaLabel}</a>` : ''}
            <span class="landing-tag">Demo facade only — login page intentionally suppressed</span>
          </div>
          <div class="landing-utility-links">
            ${renderPills(statusItems)}
          </div>
        </article>
        <aside class="landing-hero-card" aria-label="${safeText(profile.heroImageText)}">
          <p>${safeText(profile.heroImageText)}</p>
          <span>${safeText(theme.logoText)}</span>
          <small>Agent-facing launch state</small>
        </aside>
      </section>

      <section class="landing-section-grid">
        ${sectionMarkup}
      </section>

      <section class="landing-search-card">
        <h2>${safeText(profile.searchTitle)}</h2>
        <p class="landing-search-row"><span aria-hidden="true">⌕</span> ${safeText(profile.searchHint)}</p>
        <div class="landing-search-links">
          ${renderLinks(toList(theme.quickActions), 'landing-link')}
        </div>
        <p class="muted">
          ${context.liveUrl ? `<a class="carrier-link" href="${safeText(context.liveUrl)}" target="_blank" rel="noopener noreferrer">Open seeded live portal</a>` : 'Live portal URL not supplied for this profile.'}
        </p>
      </section>

      <footer class="landing-footer">
        <p>${safeText(currentFooterNote)}</p>
        <div class="landing-footer-links">
          ${renderLinks(profile.footerLinks, 'landing-footer-link')}
        </div>
      </footer>
    </div>
  `;

  const logoMark = root.querySelector('[data-logo-mark]');
  if (logoMark) {
    const logoImage = logoMark.querySelector('img');
    if (!logoImage) {
      logoMark.classList.add('is-text');
    } else {
      logoImage.addEventListener('error', () => {
        logoMark.classList.add('is-text');
      });
    }
  }

  const rpaOverlay = root.querySelector('[data-rpa-overlay]');
  const rpaStatus = root.querySelector('[data-rpa-status]');
  const rpaSteps = root.querySelector('[data-rpa-steps]');
  if (rpaOverlay && rpaStatus && rpaSteps) {
    const rpaSequence = [
      `Resolved carrier profile: ${context.carrierName}`,
      `Applied ${context.authMechanism.replace('_', ' ')} launch mode`,
      context.requiresMfa
        ? `MFA relay ready: ${context.mfaMethod.toUpperCase()}`
        : 'MFA not required for this launch',
      'Carrier landing session ready',
    ];

    rpaSequence.forEach((line, index) => {
      window.setTimeout(() => {
        const step = document.createElement('div');
        step.className = 'rpa-landing-step';
        step.innerHTML = `<span aria-hidden="true">✓</span>${safeText(line)}`;
        rpaSteps.appendChild(step);
        rpaStatus.textContent = line;

        if (index === rpaSequence.length - 1) {
          rpaOverlay.classList.add('is-complete');
          window.setTimeout(() => {
            rpaOverlay.classList.add('is-collapsed');
          }, 900);
        }
      }, 350 + index * 520);
    });
  }
})();
