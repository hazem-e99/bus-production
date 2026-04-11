import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const format = searchParams.get('format') || 'json';

    if (action === 'export') {
      return await handleExport(request, entity, format);
    } else if (action === 'import') {
      return await handleImport(request, entity, format);
    } else {
      return NextResponse.json(
        { error: 'Action must be either "export" or "import"' },
        { status: 400 }
      );
    }
    } catch (error) {
    console.error('Error in import/export operation:', error);     
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleExport(request: NextRequest, entity: string | null, format: string) {
  try {
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    let exportData: Record<string, unknown> = {};
    let filename = 'export';
    
    if (entity) {
      // Export specific entity
      if (db[entity]) {
        exportData = { [entity]: db[entity] };
        filename = `${entity}_export`;
      } else {
        return NextResponse.json(
          { error: `Entity "${entity}" not found` },
          { status: 404 }
        );
      }
    } else {
      // Export all data
      exportData = db;
      filename = 'full_database_export';
    }
    
    // Add export metadata
    exportData._exportMetadata = {
      exportedAt: new Date().toISOString(),
      entity: entity || 'all',
      format: format,
      recordCount: Object.keys(exportData).filter(key => key !== '_exportMetadata').reduce((total, key) => {
        return total + (Array.isArray(exportData[key]) ? exportData[key].length : 0);
      }, 0)
    };
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'xml') {
      // Convert to XML format
      const xmlData = convertToXML(exportData);
      return new NextResponse(xmlData, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.xml"`
        }
      });
    } else {
      // Default JSON format
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }
     } catch (error) {
     console.error('Error during export:', error);
     return NextResponse.json(
       { error: 'Export failed' },
       { status: 500 }
     );
   }
}

async function handleImport(request: NextRequest, entity: string | null, format: string) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided for import' },
        { status: 400 }
      );
    }
    
    let importData: unknown;
    const fileContent = await file.text();
    
    try {
      if (format === 'csv') {
        importData = parseCSV(fileContent);
      } else if (format === 'xml') {
        importData = parseXML(fileContent);
      } else {
        importData = JSON.parse(fileContent);
      }
         } catch (error) {
       return NextResponse.json(
         { error: `Failed to parse ${format.toUpperCase()} file` },
         { status: 400 }
       );
     }
    
    // Read current db.json
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Validate import data
    const validationResult = validateImportData(importData, entity);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: `Import validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }
    
    // Perform import
    const importResult = await performImport(db, importData, entity);
    
    // Write updated data back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({
      message: 'Import completed successfully',
      importedRecords: importResult.importedRecords,
      updatedRecords: importResult.updatedRecords,
      skippedRecords: importResult.skippedRecords,
      errors: importResult.errors
    });
     } catch (error) {
     console.error('Error during import:', error);
     return NextResponse.json(
       { error: 'Import failed' },
       { status: 500 }
     );
   }
}

function convertToCSV(data: Record<string, unknown>): string {
  const lines: string[] = [];
  
  // Handle single entity export
  if (Object.keys(data).length === 1 && !data._exportMetadata) {
    const entityName = Object.keys(data)[0];
    const entityData = data[entityName];
    
    if (Array.isArray(entityData) && entityData.length > 0) {
      // Add headers
      const headers = Object.keys(entityData[0] as Record<string, unknown>);
      lines.push(headers.join(','));
      
      // Add data rows
      (entityData as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
        const row = headers.map(header => {
          const value = item[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value || '';
        });
        lines.push(row.join(','));
      });
    }
  }
  
  return lines.join('\n');
}

function convertToXML(data: Record<string, unknown>): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<database>\n';
  
  Object.keys(data).forEach(key => {
    if (key !== '_exportMetadata') {
      xml += `  <${key}>\n`;
      if (Array.isArray(data[key])) {
        (data[key] as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
          xml += `    <item>\n`;
          Object.keys(item).forEach(itemKey => {
            xml += `      <${itemKey}>${item[itemKey]}</${itemKey}>\n`;
          });
          xml += `    </item>\n`;
        });
      }
      xml += `  </${key}>\n`;
    }
  });
  
  xml += '</database>';
  return xml;
}

function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('Invalid CSV format');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const item: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      let value = values[index] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      item[header] = value;
    });
    
    data.push(item);
  }
  
  return data;
}

function parseXML(xmlContent: string): Record<string, unknown> {
  // Simple XML parser - in production, use a proper XML parser
  const data: Record<string, unknown> = {};
  
  // Extract items from XML
  const itemMatches = xmlContent.match(/<item>([\s\S]*?)<\/item>/g);
  if (itemMatches) {
    const items: Record<string, string>[] = [];
    
    itemMatches.forEach(itemMatch => {
      const item: Record<string, string> = {};
      const fieldMatches = itemMatch.match(/<(\w+)>([^<]*)<\/\w+>/g);
      
      fieldMatches?.forEach(fieldMatch => {
        const fieldName = fieldMatch.match(/<(\w+)>/)?.[1];
        const fieldValue = fieldMatch.match(/<(\w+)>([^<]*)<\/\w+>/)?.[2];
        if (fieldName && fieldValue !== undefined) {
          item[fieldName] = fieldValue;
        }
      });
      
      items.push(item);
    });
    
    // Determine entity name from context or use default
    data.items = items;
  }
  
  return data;
}

function validateImportData(data: unknown, entity: string | null): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid data format' };
  }
  
  if (entity) {
    // Validate specific entity
    if (!Array.isArray(data)) {
      return { isValid: false, error: `Entity data must be an array` };
    }
    
    if (data.length === 0) {
      return { isValid: false, error: 'No data to import' };
    }
    
    // Check if all items have required fields (basic validation)
    const firstItem = data[0];
    if (!firstItem.id) {
      return { isValid: false, error: 'All items must have an ID field' };
    }
  }
  
  return { isValid: true };
}

async function performImport(db: Record<string, unknown[]>, importData: unknown, entity: string | null): Promise<{
  importedRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  errors: string[];
}> {
  let importedRecords = 0;
  let updatedRecords = 0;
  let skippedRecords = 0;
  const errors: string[] = [];
  
  if (entity) {
    // Import specific entity
    if (!db[entity]) {
      db[entity] = [];
    }
    
         const existingIds = new Set((db[entity] as Record<string, unknown>[]).map((item: Record<string, unknown>) => item.id as string));
    
    (importData as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
      try {
        if (existingIds.has(item.id as string)) {
          // Update existing record
                     const existingIndex = (db[entity] as Record<string, unknown>[]).findIndex((existing: Record<string, unknown>) => existing.id === item.id);
          if (existingIndex !== -1) {
                         db[entity][existingIndex] = {
               ...(db[entity][existingIndex] as Record<string, unknown>),
               ...item,
               updatedAt: new Date().toISOString()
             };
            updatedRecords++;
          }
        } else {
          // Add new record
          db[entity].push({
            ...item,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          importedRecords++;
        }
      } catch (error) {
        errors.push(`Failed to import item ${item.id}: ${error}`);
        skippedRecords++;
      }
    });
  } else {
    // Import all entities
    Object.keys(importData as Record<string, unknown>).forEach(entityKey => {
      if (entityKey !== '_exportMetadata' && Array.isArray((importData as Record<string, unknown>)[entityKey])) {
        if (!db[entityKey]) {
          db[entityKey] = [];
        }
        
                 const existingIds = new Set((db[entityKey] as Record<string, unknown>[]).map((item: Record<string, unknown>) => item.id as string));
        
        ((importData as Record<string, unknown>)[entityKey] as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
          try {
            if (existingIds.has(item.id as string)) {
              // Update existing record
                             const existingIndex = (db[entityKey] as Record<string, unknown>[]).findIndex((existing: Record<string, unknown>) => existing.id === item.id);
              if (existingIndex !== -1) {
                                 db[entityKey][existingIndex] = {
                   ...(db[entityKey][existingIndex] as Record<string, unknown>),
                   ...item,
                   updatedAt: new Date().toISOString()
                 };
                updatedRecords++;
              }
            } else {
              // Add new record
              db[entityKey].push({
                ...item,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              importedRecords++;
            }
          } catch (error) {
            errors.push(`Failed to import item ${item.id} in ${entityKey}: ${error}`);
            skippedRecords++;
          }
        });
      }
    });
  }
  
  return {
    importedRecords,
    updatedRecords,
    skippedRecords,
    errors
  };
}

export async function POST(request: NextRequest) {
  // Handle import via POST
  return await handleImport(request, null, 'json');
}
