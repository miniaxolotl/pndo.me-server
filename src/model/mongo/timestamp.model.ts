import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn} from "typeorm";

@Entity()
export default class FileTimestamp {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({type: "varchar", length: 16, unique: false, nullable: false})
	file_id!: string;

	@Column({type: "varchar", length: 16, unique: false, nullable: true})
	user_id!: string;

	@CreateDateColumn()
	date!: Date;
}