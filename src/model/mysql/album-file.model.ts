import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToOne, JoinColumn, OneToMany, ManyToOne} from "typeorm";
import { AlbumModel, MetadataModel, UserModel } from ".";

@Entity()
export default class AlbumFile {
	@PrimaryGeneratedColumn()
	id!: number;

	/* relations */

    @ManyToOne(() => AlbumModel, album => album.album_id)
	@JoinColumn({ name: "album_id", referencedColumnName: "album_id"  })
	album!: AlbumModel;

    @ManyToOne(() => MetadataModel, metadata => metadata.file_id)
	@JoinColumn({ name: "file_id", referencedColumnName: "file_id" })
	metadata!: MetadataModel;
}