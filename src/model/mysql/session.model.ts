import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn} from "typeorm";

@Entity()
export default class Session {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({type: "varchar", length: 16, unique: false, nullable: true})
	session_id!: string;

	@CreateDateColumn()
	create_date!: Date;

	@CreateDateColumn()
	expire_date!: Date;
}