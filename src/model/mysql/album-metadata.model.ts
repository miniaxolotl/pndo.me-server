import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToOne, JoinColumn, OneToMany, ManyToOne} from "typeorm";
import { AlbumModel, MetadataModel, UserModel } from ".";

@Entity()
export default class AlbumMetadata {
	@PrimaryGeneratedColumn()
	id!: number;

	/* relations */

    @ManyToOne(() => UserModel, user => user.user_id)
	@JoinColumn({ name: "user_id", referencedColumnName: "user_id" })
	user!: UserModel;

    @OneToOne(() => AlbumModel, album => album.album_id)
	@JoinColumn({ name: "album_id", referencedColumnName: "album_id" })
	album!: AlbumModel;

    @ManyToOne(() => MetadataModel, metadata => metadata.metadata_id)
	@JoinColumn({ name: "metadata_id", referencedColumnName: "metadata_id" })
	metadata!: MetadataModel;
}