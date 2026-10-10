const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex justify-center items-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">正在加载...</p>
    </div>
  </div>
);

export default LoadingFallback;
