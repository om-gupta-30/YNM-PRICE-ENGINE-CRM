import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

// POST - Bulk add all accounts (89 total)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // List of all 89 accounts to add
    const accountsToAdd = [
      // Batch 1: First 14 accounts
      'Ram Kumar Contractor Pvt. Ltd.',
      'Megha Engineering & Infrastructures Pvt. Ltd.',
      'Gayatri Projects Ltd.',
      'M. Venkata Rao Infra Projects Pvt. Ltd.',
      'Lakshmi Infrastructure & Developers India Pvt. Ltd.',
      'SLMI Infra Projects Pvt. Ltd.',
      'Dilip Buildcon Ltd.',
      'KMV Projects Ltd.',
      'H. G. Infra Engineering Ltd.',
      'Dineshchandra R. Agrawal Infracon Pvt. Ltd.',
      'VDB Projects Pvt. Ltd.',
      'G R Infraprojects Ltd.',
      'R.K. Infracorp Pvt. Ltd.',
      'Anusha Projects Pvt. Ltd.',
      // Batch 2: Next 37 accounts
      'Aqua Space Developers Pvt. Ltd.',
      'Rajapushpa Properties Pvt. Ltd.',
      'S R Infra & Developers',
      'Honer Homes',
      'Aparna Infrahousing Pvt. Ltd.',
      'My Home Constructions Pvt. Ltd.',
      'Incor Lake City Projects Pvt. Ltd.',
      'Phoenix Global Spaces Pvt. Ltd.',
      'Greenmark Developers Pvt. Ltd.',
      'Hyma Developers Pvt. Ltd.',
      'Eden Buildcon Pvt. Ltd.',
      'Tellapur Technocity Pvt. Ltd.',
      'First SMR Holdings',
      'Raghuram Constructions & Developers Pvt Ltd',
      'Aparna Constructions & Estates Pvt. Ltd.',
      'Aaditri Properties Pvt. Ltd.',
      'Prestige Estates Projects Ltd.',
      'Sensation Infracon Pvt. Ltd.',
      'Auro Realty Pvt. Ltd.',
      'Gangothri Developers',
      'Samvir Estates LLP',
      'Lansum Properties LLP',
      'Raghava Highrise',
      'Aaditri Housing Pvt. Ltd.',
      'Alekhya Homes Pvt. Ltd.',
      'RS Pasura Tellapur Builders LLP',
      'Vasavi Homes LLP',
      'Ektha Western Windsor Park LLP',
      'Karimnagar Smart City Corporation Ltd.',
      'Aliens Developers Pvt. Ltd.',
      'DSR Prime Spaces',
      'Anuktha Ikigai City Developers Pvt. Ltd.',
      'Sumadhura Constructions Pvt. Ltd.',
      'Mahira Ventures Pvt. Ltd.',
      'MSN Urban Ventures LLP',
      'Telangana Power Generation Corporation Ltd.',
      'Yula Globus Developers LLP',
      // Batch 3: Last 38 accounts
      'Oakmont Developers LLP',
      'Candeur Developers & Builders',
      'Supadha Developers Pvt. Ltd.',
      'Jayabheri Properties Pvt. Ltd.',
      'S.S. Holdings & Investments',
      'Cloudswood Constructions Pvt. Ltd.',
      'Nivan Habitats Pvt. Ltd.',
      'Ashoka Builders India Pvt. Ltd.',
      'Venkata Praneeth Developers Pvt. Ltd.',
      'Vertex Homes Pvt. Ltd.',
      'Phoenix Spaces Pvt. Ltd.',
      'DSR KC Builders & Developers',
      'Aspire Spaces Pvt. Ltd.',
      'Ramky Estates & Farms Pvt. Ltd.',
      'Vajra Infra Project LLP',
      'Team 4 Life Spaces LLP',
      'NSL SEZ Hyderabad Pvt. Ltd.',
      'Sri Sreenivasa Infra',
      'Alliance Inn India Pvt. Ltd.',
      'Sri Aditya Kedia Realtors LLP',
      'Supadha Infra Pvt. Ltd.',
      'Om Sree Builders & Developers LLP',
      'Kurra Infra LLP',
      'Anvita Buildpro LLP',
      'Varapradha Real Estates Pvt. Ltd.',
      'Newmark Urbanspaces',
      'Vasavi Infrastructures LLP',
      'Anuhar Mahan Homes LLP',
      'Raghava Projects',
      'Blueoak Constructions',
      'Vision Infra Developers (India) Pvt. Ltd.',
      'Squarespace Infra City Pvt. Ltd.',
      'Anand Homes, Hyderabad',
      'Poulomi Estates Pvt. Ltd.',
      'Candeur Constructions',
      'Shanta Sriram Constructions Pvt. Ltd.',
      'Mahaveer Estate Projects',
      'Indis Smart Homes Pvt. Ltd.',
    ];

    const currentTime = getCurrentISTTime();
    const createdBy = 'System';

    // Prepare insert data
    const accountsData = accountsToAdd.map((accountName) => ({
      account_name: accountName.trim(),
      company_stage: 'Enterprise',
      company_tag: 'New',
      assigned_employee: null,
      engagement_score: 0,
      is_active: true,
      created_at: currentTime,
      updated_at: currentTime,
    }));

    // Check for existing accounts to avoid duplicates
    const { data: existingAccounts, error: checkError } = await supabase
      .from('accounts')
      .select('account_name')
      .in('account_name', accountsToAdd.map(name => name.trim()));

    if (checkError) {
      console.error('Error checking existing accounts:', checkError);
      return NextResponse.json(
        { error: `Failed to check existing accounts: ${checkError.message}` },
        { status: 500 }
      );
    }

    const existingNames = new Set((existingAccounts || []).map((acc: any) => acc.account_name));
    const newAccounts = accountsData.filter(acc => !existingNames.has(acc.account_name));

    if (newAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All accounts already exist',
        added: 0,
        skipped: accountsToAdd.length,
        skippedAccounts: accountsToAdd,
      });
    }

    // Insert new accounts in batches to avoid payload size issues
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < newAccounts.length; i += batchSize) {
      batches.push(newAccounts.slice(i, i + batchSize));
    }

    let allInsertedAccounts: any[] = [];
    let insertErrors: string[] = [];

    for (const batch of batches) {
      const { data: insertedAccounts, error: insertError } = await supabase
        .from('accounts')
        .insert(batch)
        .select('id, account_name');

      if (insertError) {
        console.error('Error inserting accounts batch:', insertError);
        insertErrors.push(insertError.message);
      } else if (insertedAccounts) {
        allInsertedAccounts = [...allInsertedAccounts, ...insertedAccounts];
      }
    }

    if (insertErrors.length > 0 && allInsertedAccounts.length === 0) {
      return NextResponse.json(
        { error: `Failed to insert accounts: ${insertErrors.join('; ')}` },
        { status: 500 }
      );
    }

    // Log activity for bulk creation
    if (allInsertedAccounts.length > 0) {
      const activityDescription = `Bulk created ${allInsertedAccounts.length} accounts: ${allInsertedAccounts.slice(0, 5).map((a: any) => a.account_name).join(', ')}${allInsertedAccounts.length > 5 ? ` and ${allInsertedAccounts.length - 5} more` : ''}`;
      
      await supabase.from('activities').insert({
        activity_type: 'account',
        description: activityDescription,
        created_by: createdBy,
        metadata: {
          action: 'bulk_create',
          account_count: allInsertedAccounts.length,
          account_ids: allInsertedAccounts.map((a: any) => a.id),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${allInsertedAccounts.length} account(s)`,
      added: allInsertedAccounts.length,
      skipped: accountsToAdd.length - allInsertedAccounts.length,
      accounts: allInsertedAccounts,
      errors: insertErrors.length > 0 ? insertErrors : undefined,
    });
  } catch (error: any) {
    console.error('Error in bulk add accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
