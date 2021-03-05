import {Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { AlbumMetadataModel, CommentModel, MetadataModel } from ".";

@Entity()
export default class Album {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: "varchar", unique: true, nullable: false })
	album_id!: string;

	@Column({ type: "varchar", nullable: false })
	title!: string;

	@Column({ type: "boolean", nullable: false, default: false })
	protected!: boolean;

	@Column({ type: "boolean", nullable: false, default: true })
	hidden!: boolean;

	@Column({ type: "int", default: 0 })
	d_count!: number;

	@Column({ type: "int", default: 0 })
	v_count!: number;

	/* relations */

}