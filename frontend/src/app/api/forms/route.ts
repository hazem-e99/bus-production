import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

function getDefaultFormsConfig() {
  return {
    commonFields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'nationalId', label: 'National ID', type: 'text', required: true }
    ],
    roleSpecificFields: {
      student: [
        { name: 'studentAcademicNumber', label: 'Student Academic Number', type: 'text', required: true },
        { name: 'department', label: 'Department', type: 'select', required: true, options: [
          'Medicine', 'Dentistry', 'Pharmacy', 'VeterinaryMedicine', 'Nursing',
          'CivilEngineering', 'MechanicalEngineering', 'ElectricalEngineering', 'ComputerEngineering', 'ChemicalEngineering',
          'Architecture', 'ComputerScience', 'InformationTechnology', 'SoftwareEngineering', 'DataScience',
          'BusinessAdministration', 'Accounting', 'Finance', 'Marketing', 'Economics', 'Management',
          'Law', 'ArabicLanguageAndLiterature', 'EnglishLanguageAndLiterature', 'History', 'Philosophy',
          'Geography', 'PoliticalScience', 'Psychology', 'Sociology', 'SocialWork', 'InternationalRelations',
          'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Agriculture', 'AgriculturalEngineering',
          'Education', 'FineArts', 'Music', 'GraphicDesign', 'MassCommunication', 'Journalism',
          'PhysicalEducation', 'TourismAndHotels'
        ]},
        { name: 'academicYear', label: 'Academic Year', type: 'select', required: true, options: [
          'PreparatoryYear', 'FirstYear', 'SecondYear', 'ThirdYear', 'FourthYear',
          'FifthYear', 'SixthYear', 'SeventhYear',
          'MastersFirstYear', 'MastersSecondYear', 'MastersThirdYear',
          'PhDFirstYear', 'PhDSecondYear', 'PhDThirdYear', 'PhDFourthYear', 'PhDFifthYear', 'PhDSixthYear',
          'ResidencyFirstYear', 'ResidencySecondYear', 'ResidencyThirdYear', 'ResidencyFourthYear', 'ResidencyFifthYear',
          'FellowshipFirstYear', 'FellowshipSecondYear',
          'ExchangeStudent', 'VisitingStudent', 'NonDegreeStudent', 'ContinuingEducation',
          'DiplomaFirstYear', 'DiplomaSecondYear', 'DiplomaThirdYear',
          'ProfessionalFirstYear', 'ProfessionalSecondYear', 'ProfessionalThirdYear', 'ProfessionalFourthYear',
          'RepeatYear', 'ThesisWriting', 'DissertationWriting'
        ]}
      ],
      driver: [
        // No additional fields beyond common fields
      ],
      supervisor: [
        // No additional fields beyond common fields
      ],
      movementManager: [
        // No additional fields beyond common fields
      ],
      admin: [
        // No additional fields beyond common fields
      ]
    }
  };
}

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const forms = db.forms || getDefaultFormsConfig();
    return NextResponse.json(forms);
  } catch {
    console.error('Error fetching forms config:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    db.forms = { ...(db.forms || {}), ...body };
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json(db.forms);
  } catch {
    console.error('Error updating forms config:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


