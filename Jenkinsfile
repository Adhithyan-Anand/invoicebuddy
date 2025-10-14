pipeline {
    // Define no global agent; each stage will define its own
    agent none

    stages {
        stage('Checkout') {
            agent any // A simple agent is fine for just checking out code
            steps {
                // Clean the workspace before checkout to ensure a fresh start
                cleanWs()
                checkout scm
            }
        }

        stage('Build Frontend') {
            // Use a specific Node.js environment for the frontend build
            agent {
                docker { image 'node:18-alpine' }
            }
            steps {
                dir('client') {
                    echo 'Installing dependencies and building the frontend...'
                    sh 'npm install'
                    sh 'npm run build'
                }
                // Save the built frontend assets to pass to the next stage
                stash name: 'frontend-build', includes: 'client/build/**'
            }
        }

        stage('Build Backend') {
            // Use a specific Java & Maven environment for the backend build
            agent {
                docker { image 'maven:3.8-openjdk-17' }
            }
            steps {
                // Retrieve the built frontend assets from the previous stage
                unstash 'frontend-build'

                // Copy the frontend build into the location Spring Boot serves static files from
                echo 'Copying frontend assets to Spring Boot static directory...'
                sh 'mkdir -p src/main/resources/static'
                sh 'cp -r client/build/* src/main/resources/static/'

                // Compile, test, and package the Java application into a .jar file
                echo 'Compiling and packaging the backend...'
                sh 'mvn clean package'

                // Save the packaged .jar file to pass to the Docker build stage
                stash name: 'java-build', includes: 'target/*.jar'
            }
        }

        stage('Build Docker Image') {
            agent any // Use an agent that has Docker installed
            steps {
                // Retrieve the packaged .jar file
                unstash 'java-build'
                
                script {
                    echo "Building Docker image..."
                    // This will now succeed because the .jar file exists in target/
                    def dockerImage = docker.build("adhithyananand/invoicebuddy:${env.BUILD_NUMBER}", ".")
                }
            }
        }

        stage('Push Docker Image (Optional)') {
            agent any
            // This 'when' block is a great way to make this stage conditional
            when { expression { return env.DOCKER_HUB_CREDENTIALS_ID } }
            steps {
                // Use the credential ID from an environment variable for flexibility
                withCredentials([usernamePassword(credentialsId: env.DOCKER_HUB_CREDENTIALS_ID, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    script {
                        def imageName = "adhithyananand/invoicebuddy:${env.BUILD_NUMBER}"
                        echo "Logging into Docker Hub and pushing image: ${imageName}"
                        sh 'echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin'
                        sh "docker push ${imageName}"
                    }
                }
            }
        }

        stage('Deploy') {
            agent any
            steps {
                echo 'Deploy stage is a placeholder. Add your deployment logic here.'
                // Example: sh 'ssh user@your-server "docker pull ... && docker run ..."'
            }
        }
    }

    post {
    always {
        // Assign an agent for the cleanup tasks
        agent any
        steps {
            echo 'Cleaning up the workspace.'
            cleanWs()
        }
    }
  }
}