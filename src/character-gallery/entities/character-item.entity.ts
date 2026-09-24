import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CharacterAppearance } from '../types/character-appearance.types';

@Entity('character_items')
export class CharacterItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'jsonb' })
  appearance!: CharacterAppearance;

  @Column({ type: 'varchar', nullable: true })
  style!: string | null;

  @Column({ type: 'varchar', nullable: true })
  collectionId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('character_collection_items')
export class CharacterCollectionItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  style!: string | null;

  @Column({ type: 'text', nullable: true })
  styleDescription!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
