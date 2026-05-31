import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DbMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DbMigrationService.name);

  constructor(@InjectConnection() private connection: Connection) {}

  async onApplicationBootstrap() {
    this.logger.log('🔄 Checking database for missing numeric IDs...');
    try {
      const db = this.connection.db;
      if (!db) {
        this.logger.error('❌ Mongoose connection DB is undefined.');
        return;
      }
      const collections = await db.listCollections().toArray();
      const targetCollections = [
        'users',
        'buses',
        'trips',
        'tripbookings',
        'payments',
        'notifications',
        'subscriptionplans',
        'studentsubscriptions',
        'routes',
        'attendance',
        'voting_surveys',
        'vote_responses'
      ];

      for (const col of collections) {
        if (!targetCollections.includes(col.name)) continue;
        const collection = db.collection(col.name);
        
        // Find all documents missing numericId
        const cursor = collection.find({ numericId: { $exists: false } });
        let count = 0;
        
        while (await cursor.hasNext()) {
          const doc = await cursor.next();
          if (doc) {
            const numericId = parseInt(doc._id.toString().slice(-8), 16) % 100000;
            await collection.updateOne({ _id: doc._id }, { $set: { numericId } });
            count++;
          }
        }
        
        if (count > 0) {
          this.logger.log(`  Updated ${count} documents in collection '${col.name}' with numericId.`);
        }
      }
      this.logger.log('✅ Database numeric ID check complete.');
    } catch (error: any) {
      this.logger.error('❌ Failed to run database migration:', error.stack);
    }
  }
}
