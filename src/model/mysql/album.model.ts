import {Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from "typeorm";
import { AlbumMetadataModel, CommentModel, MetadataModel } from ".";

@Entity()
export default class Album {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: "varchar", unique: true, nullable: false })
	album_id!: string;

	@Column({ type: "varchar", nullable: false })
	title!: string;

	@Column({ type: "varchar", nullable: true })
	password!: string;

	@Column({ type: "boolean", nullable: false, default: false })
	protected!: boolean;

	@Column({ type: "boolean", nullable: false, default: true })
	hidden!: boolean;

	@Column({ type: "int", default: 0 })
	d_count!: number;

	@Column({ type: "int", default: 0 })
	v_count!: number;

	@Column({ type: "boolean", default: false, nullable: false })
	deleted!: boolean;

	@CreateDateColumn()
	create_date!: Date;
	
	/* relations */

}