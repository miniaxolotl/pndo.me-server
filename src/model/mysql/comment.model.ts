import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn} from "typeorm";

@Entity()
export default class Comment {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({type: "varchar", length: 16, unique: false, nullable: false})
	file_id!: string;

	@Column({type: "varchar", length: 16, unique: false, nullable: true})
	user_id!: string;

	@Column({type: "text", nullable: false})
	message!: string;

	@CreateDateColumn()
	create_date!: Date;
}