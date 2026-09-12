import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GenereationItemStatus } from '../../../shared/constants/generation-item';

@Entity('generation_items')
export class GenerationItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: GenereationItemStatus,
    default: GenereationItemStatus.WaitingStart,
  })
  status!: GenereationItemStatus;

  @Column({ type: 'varchar', nullable: true })
  currentStep!: string | null;

  @Column({ type: 'jsonb' })
  input!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  script!: string | null;

  @Column({ type: 'text', nullable: true })
  audioUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  videoUrl!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  videoStorageKey!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  error!: { step: string; message: string; occurredAt: string } | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
