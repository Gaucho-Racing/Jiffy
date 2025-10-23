package service

import (
	"context"
	"fmt"
	"jiffy/config"
	"jiffy/utils"
	"mime/multipart"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

var client *s3.Client

func InitializeS3() error {
	cfg, err := awsconfig.LoadDefaultConfig(context.TODO(),
		awsconfig.WithRegion(config.S3.Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			config.S3.AccessKey,
			config.S3.SecretKey,
			"",
		)),
	)
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %v", err)
	}

	client = s3.NewFromConfig(cfg)
	utils.SugarLogger.Info("S3 client initialized successfully")
	return nil
}

func UploadFileToS3(file *multipart.FileHeader, prID int) (string, error) {
	if client == nil {
		return "", fmt.Errorf("S3 client not initialized")
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %v", err)
	}
	defer src.Close()

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("jiffy/pr-%d/%s%s", prID, uuid.New().String(), ext)

	contentType := file.Header.Get("Content-Type")
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(config.S3.Bucket),
		Key:         aws.String(filename),
		Body:        src,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %v", err)
	}

	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", config.S3.Bucket, config.S3.Region, filename)
	return url, nil
}
