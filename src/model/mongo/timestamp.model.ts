import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export default class FileTimestamp {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({type: "varchar", length: 128, unique: false, nullable: false})
	file_id!: string;

	@Column({type: "date", unique: false, nullable: false, default: Date.now})
	time!: Date;
}