package service;

import model.GraphVersion;

public class VersionManager {

    private GraphVersion version;

    public VersionManager() {

        version = new GraphVersion(1);

    }

    public GraphVersion getCurrentVersion(){

        return version;

    }

    public void updateVersion(){

        version = new GraphVersion(version.getVersion()+1);


        System.out.println("Graph Updated");

        System.out.println(version);

    }
    public void incrementVersion() {

        updateVersion();

    }

}
