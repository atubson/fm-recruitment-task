import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Image {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 1024 })
    path: string;

    @Column({ type: 'varchar', length: 255, name: 'original_name' })
    originalName: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'varchar', length: 50 })
    mimetype: string;

    @Column({ type: 'int' })
    width: number;

    @Column({ type: 'int' })
    height: number;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
    createdAt: Date;
}