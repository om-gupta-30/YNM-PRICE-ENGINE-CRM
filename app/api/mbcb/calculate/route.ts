import { NextRequest, NextResponse } from 'next/server';
import { findMbcbRow } from '@/lib/utils/mbcbData';

export type PartInput = {
  thickness?: number;
  length?: number | null;
  coatingGsm?: number;
};

export type RequestBody = {
  section: "W-Beam Section";
  wBeam: PartInput;
  post: PartInput;
  spacer: PartInput;
  ratePerKg?: number | null;
};

export type PartResult = {
  found: boolean;
  error?: string;
  weightBlackMaterial?: number;
  weightZincAdded?: number;
  totalWeight?: number;
  inputs?: {
    thickness?: number;
    length?: number | null;
    coatingGsm?: number;
  };
};

export type CalculateResponse = {
  section: string;
  parts: {
    wBeam: PartResult;
    post: PartResult;
    spacer: PartResult;
  };
  totals: {
    totalBlackWeight: number;
    totalZincWeight: number;
    totalWeight: number;
    ratePerKg: number | null;
    totalPrice: number | null;
  };
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    // Hardcode section to W-Beam Section
    const section = "W-Beam Section";

    // Initialize results
    const parts: {
      wBeam: PartResult;
      post: PartResult;
      spacer: PartResult;
    } = {
      wBeam: { found: false },
      post: { found: false },
      spacer: { found: false },
    };

    // Process W-Beam (always included)
    if (!body.wBeam.thickness || !body.wBeam.coatingGsm) {
      parts.wBeam = {
        found: false,
        error: "Thickness and Coating GSM are required for W-Beam",
      };
    } else {
      const row = findMbcbRow(
        "W-Beam",
        body.wBeam.thickness,
        body.wBeam.coatingGsm,
        null,
        "W-Beam Section"
      );

      if (row) {
        parts.wBeam = {
          found: true,
          weightBlackMaterial: row.weightBlackMaterial,
          weightZincAdded: row.weightZincAdded,
          totalWeight: row.weightBlackMaterial + row.weightZincAdded,
          inputs: {
            thickness: body.wBeam.thickness,
            length: null,
            coatingGsm: body.wBeam.coatingGsm,
          },
        };
      } else {
        parts.wBeam = {
          found: false,
          error: "No matching row found in Excel",
          inputs: {
            thickness: body.wBeam.thickness,
            length: null,
            coatingGsm: body.wBeam.coatingGsm,
          },
        };
      }
    }

    // Process Post (always included)
    if (!body.post.thickness || !body.post.length || !body.post.coatingGsm) {
      parts.post = {
        found: false,
        error: "Thickness, Length, and Coating GSM are required for Post",
      };
    } else {
      const row = findMbcbRow(
        "Post",
        body.post.thickness,
        body.post.coatingGsm,
        body.post.length,
        "W-Beam Section"
      );

      if (row) {
        parts.post = {
          found: true,
          weightBlackMaterial: row.weightBlackMaterial,
          weightZincAdded: row.weightZincAdded,
          totalWeight: row.weightBlackMaterial + row.weightZincAdded,
          inputs: {
            thickness: body.post.thickness,
            length: body.post.length,
            coatingGsm: body.post.coatingGsm,
          },
        };
      } else {
        parts.post = {
          found: false,
          error: "No matching row found in Excel",
          inputs: {
            thickness: body.post.thickness,
            length: body.post.length,
            coatingGsm: body.post.coatingGsm,
          },
        };
      }
    }

    // Process Spacer (always included)
    if (!body.spacer.thickness || !body.spacer.length || !body.spacer.coatingGsm) {
      parts.spacer = {
        found: false,
        error: "Thickness, Length, and Coating GSM are required for Spacer",
      };
    } else {
      const row = findMbcbRow(
        "Spacer",
        body.spacer.thickness,
        body.spacer.coatingGsm,
        body.spacer.length,
        "W-Beam Section"
      );

      if (row) {
        parts.spacer = {
          found: true,
          weightBlackMaterial: row.weightBlackMaterial,
          weightZincAdded: row.weightZincAdded,
          totalWeight: row.weightBlackMaterial + row.weightZincAdded,
          inputs: {
            thickness: body.spacer.thickness,
            length: body.spacer.length,
            coatingGsm: body.spacer.coatingGsm,
          },
        };
      } else {
        parts.spacer = {
          found: false,
          error: "No matching row found in Excel",
          inputs: {
            thickness: body.spacer.thickness,
            length: body.spacer.length,
            coatingGsm: body.spacer.coatingGsm,
          },
        };
      }
    }

    // Calculate totals
    let totalBlackWeight = 0;
    let totalZincWeight = 0;

    if (parts.wBeam.found) {
      totalBlackWeight += parts.wBeam.weightBlackMaterial || 0;
      totalZincWeight += parts.wBeam.weightZincAdded || 0;
    }
    if (parts.post.found) {
      totalBlackWeight += parts.post.weightBlackMaterial || 0;
      totalZincWeight += parts.post.weightZincAdded || 0;
    }
    if (parts.spacer.found) {
      totalBlackWeight += parts.spacer.weightBlackMaterial || 0;
      totalZincWeight += parts.spacer.weightZincAdded || 0;
    }

    const totalWeight = totalBlackWeight + totalZincWeight;
    const ratePerKg = body.ratePerKg || null;
    const totalPrice = ratePerKg !== null ? totalWeight * ratePerKg : null;

    const response: CalculateResponse = {
      section: section,
      parts,
      totals: {
        totalBlackWeight,
        totalZincWeight,
        totalWeight,
        ratePerKg,
        totalPrice,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating MBCB:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
